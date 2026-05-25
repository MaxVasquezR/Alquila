import { AppDataSource } from '../../config/data-source';
import { env } from '../../config/env';
import { Product } from '../../entities/product.entity';
import { ProductImage } from '../../entities/product-image.entity';
import { Ad } from '../../entities/ad.entity';
import { ProductStatus, AuditAction } from '../../types/enums';
import { encrypt, encryptNumber, decrypt, decryptNumber } from '../../utils/encryption';
import {
  fuzzCoordinates,
  buildLocationLabel,
} from '../../utils/location-privacy';
import { AppError } from '../../middleware/error-handler';
import { toProductPublicDto } from './product.public-mapper';
import { getDistrictCoords } from '../../data/district-coords';
import { trustService } from '../../services/trust.service';
import { listingCheckoutService } from '../account/account.service';
import { auditService } from '../../services/audit.service';
import {
  CreateProductInput,
  CreateProductExpressInput,
  UpdateProductInput,
  ListProductsQuery,
} from './products.schemas';

export class ProductsService {
  private productRepo = AppDataSource.getRepository(Product);
  private productImageRepo = AppDataSource.getRepository(ProductImage);

  async create(ownerId: string, input: CreateProductInput) {
    await trustService.assertCanPublish(ownerId);
    await this.syncExpiredProducts();
    const needsPay = await listingCheckoutService.needsPayment(ownerId);
    const imageUrls = this.resolveImageUrls(input);

    const { publicLat, publicLng } = fuzzCoordinates(
      input.exactLat,
      input.exactLng,
    );

    const product = this.productRepo.create({
      title: input.title,
      description: input.description,
      category: input.category,
      pricePerDay: input.pricePerDay.toFixed(2),
      pricePerHour: input.pricePerHour?.toFixed(2),
      district: input.district,
      locationLabel: buildLocationLabel(
        input.district,
        input.locationReference,
      ),
      publicLat,
      publicLng,
      exactAddressEncrypted: encrypt(input.exactAddress),
      exactLatEncrypted: encryptNumber(input.exactLat),
      exactLngEncrypted: encryptNumber(input.exactLng),
      ownerId,
      status: needsPay ? ProductStatus.PENDING_PAYMENT : ProductStatus.ACTIVE,
      imageUrl: imageUrls[0],
      coverImageUrl: imageUrls[0],
      publishedAt: needsPay ? undefined : new Date(),
      expiresAt: needsPay ? undefined : this.getListingExpiryDate(),
      availableToday: true,
    });

    await this.productRepo.save(product);
    await this.saveProductImages(product.id, imageUrls);
    if (!needsPay) {
      await listingCheckoutService.consumeFreeListing(ownerId);
    }
    const withOwner = await this.findByIdWithOwner(product.id);
    return {
      ...toProductPublicDto(withOwner!),
      paymentRequired: needsPay,
      listingFeePen: needsPay ? env.listingFeePen : 0,
    };
  }

  /** Publicación express: 4 campos + defaults seguros de privacidad */
  async createExpress(ownerId: string, input: CreateProductExpressInput) {
    await trustService.assertCanPublish(ownerId);
    await this.syncExpiredProducts();
    const needsPay = await listingCheckoutService.needsPayment(ownerId);
    const coords = getDistrictCoords(input.district);
    const exactAddress = `Zona ${input.district} (completar en chat)`;
    const { publicLat, publicLng } = fuzzCoordinates(coords.lat, coords.lng);
    const imageUrls = this.resolveImageUrls(input);

    const product = this.productRepo.create({
      title: input.title,
      description:
        input.description?.trim() ||
        `${input.title} — alquiler en ${input.district}. Contactar por chat.`,
      category: input.category,
      pricePerDay: input.pricePerDay.toFixed(2),
      district: input.district,
      locationLabel: buildLocationLabel(input.district, input.locationReference),
      publicLat,
      publicLng,
      exactAddressEncrypted: encrypt(exactAddress),
      exactLatEncrypted: encryptNumber(coords.lat),
      exactLngEncrypted: encryptNumber(coords.lng),
      ownerId,
      status: needsPay ? ProductStatus.PENDING_PAYMENT : ProductStatus.ACTIVE,
      imageUrl: imageUrls[0],
      coverImageUrl: imageUrls[0],
      publishedAt: needsPay ? undefined : new Date(),
      expiresAt: needsPay ? undefined : this.getListingExpiryDate(),
      availableToday: input.availableToday ?? true,
    });

    await this.productRepo.save(product);
    await this.saveProductImages(product.id, imageUrls);
    if (!needsPay) {
      await listingCheckoutService.consumeFreeListing(ownerId);
    }
    await auditService.log(ownerId, AuditAction.PRODUCT_PUBLISHED, 'product', product.id, {
      needsPayment: needsPay,
    });
    const withOwner = await this.findByIdWithOwner(product.id);
    const dto = toProductPublicDto(withOwner!);
    return {
      ...dto,
      paymentRequired: needsPay,
      listingFeePen: needsPay ? env.listingFeePen : 0,
    };
  }

  async list(query: ListProductsQuery) {
    await this.syncExpiredProducts();
    const qb = this.productRepo
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.owner', 'owner')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.status = :status', { status: ProductStatus.ACTIVE });

    if (query.district) {
      qb.andWhere('product.district = :district', { district: query.district });
    }
    if (query.category) {
      qb.andWhere('product.category = :category', { category: query.category });
    }
    if (query.availableToday) {
      qb.andWhere('product.availableToday = :at', { at: true });
    }
    if (query.minPrice !== undefined) {
      qb.andWhere('product.pricePerDay >= :minPrice', {
        minPrice: query.minPrice,
      });
    }
    if (query.maxPrice !== undefined) {
      qb.andWhere('product.pricePerDay <= :maxPrice', {
        maxPrice: query.maxPrice,
      });
    }

    const now = new Date();
    if (query.featured) {
      qb.innerJoin(
        Ad,
        'ad',
        'ad.productId = product.id AND ad.isActive = true AND ad.startsAt <= :now AND ad.endsAt >= :now',
        { now },
      );
    }

    switch (query.sort) {
      case 'price_asc':
        qb.orderBy('product.pricePerDay', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('product.pricePerDay', 'DESC');
        break;
      default:
        qb.orderBy('product.createdAt', 'DESC');
    }

    const skip = (query.page - 1) * query.limit;
    qb.skip(skip).take(query.limit);

    const [products, total] = await qb.getManyAndCount();

    let featuredIds = new Set<string>();
    if (!query.featured && products.length > 0) {
      const ids = products.map((p) => p.id);
      const activeAds = await AppDataSource.getRepository(Ad)
        .createQueryBuilder('ad')
        .where('ad.productId IN (:...ids)', { ids })
        .andWhere('ad.isActive = true')
        .andWhere('ad.startsAt <= :now', { now })
        .andWhere('ad.endsAt >= :now', { now })
        .getMany();
      featuredIds = new Set(activeAds.map((a) => a.productId));
    }

    return {
      data: products.map((p) =>
        toProductPublicDto(p, {
          isFeatured: query.featured || featuredIds.has(p.id),
          promotionLabel: query.featured || featuredIds.has(p.id) ? 'Super Promo' : undefined,
        }),
      ),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getByIdPublic(id: string) {
    await this.syncExpiredProducts();
    const product = await this.findByIdWithOwner(id);
    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND');
    }
    return toProductPublicDto(product);
  }

  async getMyProducts(ownerId: string) {
    await this.syncExpiredProducts();
    const products = await this.productRepo.find({
      where: { ownerId },
      relations: { owner: true, images: true },
      order: { createdAt: 'DESC' },
    });

    return products
      .filter((p) => p.status !== ProductStatus.DELETED)
      .map((p) => ({
      ...toProductPublicDto(p),
      exactLocation: {
        address: decrypt(p.exactAddressEncrypted),
        lat: decryptNumber(p.exactLatEncrypted),
        lng: decryptNumber(p.exactLngEncrypted),
      },
    }));
  }

  async update(ownerId: string, productId: string, input: UpdateProductInput) {
    const product = await this.productRepo.findOne({
      where: { id: productId, ownerId },
      relations: { owner: true, images: true },
    });
    if (!product) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND');
    }
    if (![ProductStatus.DRAFT, ProductStatus.PENDING_PAYMENT].includes(product.status)) {
      throw new AppError(
        403,
        'La publicación ya está activa y no se puede editar',
        'PUBLICATION_LOCKED',
      );
    }

    if (input.title) product.title = input.title;
    if (input.description) product.description = input.description;
    if (input.category) product.category = input.category;
    if (input.pricePerDay !== undefined) {
      product.pricePerDay = input.pricePerDay.toFixed(2);
    }
    if (input.pricePerHour !== undefined) {
      product.pricePerHour = input.pricePerHour.toFixed(2);
    }
    if (input.status) {
      const allowedStatuses = [ProductStatus.DRAFT, ProductStatus.PENDING_PAYMENT, ProductStatus.INACTIVE];
      if (!allowedStatuses.includes(input.status)) {
        throw new AppError(400, 'Estado no permitido', 'INVALID_STATUS');
      }
      product.status = input.status;
    }

    if (
      input.exactLat !== undefined &&
      input.exactLng !== undefined
    ) {
      const lat = input.exactLat;
      const lng = input.exactLng;
      const fuzzed = fuzzCoordinates(lat, lng);
      product.publicLat = fuzzed.publicLat;
      product.publicLng = fuzzed.publicLng;
      product.exactLatEncrypted = encryptNumber(lat);
      product.exactLngEncrypted = encryptNumber(lng);
    }
    if (input.exactAddress) {
      product.exactAddressEncrypted = encrypt(input.exactAddress);
    }
    if (input.district) {
      product.district = input.district;
      product.locationLabel = buildLocationLabel(
        input.district,
        input.locationReference,
      );
    }

    await this.productRepo.save(product);
    return toProductPublicDto(product);
  }

  async delete(ownerId: string, productId: string) {
    const product = await this.productRepo.findOne({
      where: { id: productId, ownerId },
    });
    if (!product) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND');
    }
    if (product.status === ProductStatus.DELETED) {
      throw new AppError(400, 'La publicación ya fue eliminada', 'ALREADY_DELETED');
    }
    if (product.status === ProductStatus.RENTED) {
      throw new AppError(
        400,
        'No puedes eliminar una publicación con trato en curso',
        'PRODUCT_IN_USE',
      );
    }

    product.status = ProductStatus.DELETED;
    product.deletedAt = new Date();
    product.availableToday = false;
    await this.productRepo.save(product);
    await auditService.log(ownerId, AuditAction.PRODUCT_DELETED, 'product', product.id);
    return { deleted: true, id: product.id, status: product.status };
  }

  async republish(ownerId: string, productId: string) {
    const source = await this.productRepo.findOne({
      where: { id: productId, ownerId },
      relations: { images: true, owner: true },
    });
    if (!source) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND');
    }
    const republishableStatuses = [ProductStatus.EXPIRED];
    if (!republishableStatuses.includes(source.status)) {
      throw new AppError(
        400,
        'Solo puedes republicar publicaciones vencidas',
        'INVALID_STATUS',
      );
    }

    await trustService.assertCanPublish(ownerId);

    const imageUrls = [...(source.images ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((image) => image.url);

    const republished = this.productRepo.create({
      title: source.title,
      description: source.description,
      category: source.category,
      pricePerDay: source.pricePerDay,
      pricePerHour: source.pricePerHour,
      district: source.district,
      locationLabel: source.locationLabel,
      publicLat: source.publicLat,
      publicLng: source.publicLng,
      exactAddressEncrypted: source.exactAddressEncrypted,
      exactLatEncrypted: source.exactLatEncrypted,
      exactLngEncrypted: source.exactLngEncrypted,
      ownerId,
      status: ProductStatus.PENDING_PAYMENT,
      imageUrl: source.imageUrl,
      coverImageUrl: source.coverImageUrl,
      availableToday: source.availableToday,
      republishedFromId: source.id,
    });

    await this.productRepo.save(republished);
    await this.saveProductImages(republished.id, imageUrls);
    await auditService.log(ownerId, AuditAction.PRODUCT_REPUBLISHED, 'product', republished.id, {
      sourceProductId: source.id,
    });

    const withOwner = await this.findByIdWithOwner(republished.id);
    return {
      ...toProductPublicDto(withOwner!),
      paymentRequired: true,
      listingFeePen: env.listingFeePen,
    };
  }

  private async findByIdWithOwner(id: string) {
    return this.productRepo.findOne({
      where: { id },
      relations: { owner: true, images: true },
    });
  }

  async syncExpiredProducts() {
    const expiredProducts = await this.productRepo.find({
      where: { status: ProductStatus.ACTIVE },
    });
    const now = new Date();
    const stale = expiredProducts.filter(
      (product) => product.expiresAt && product.expiresAt.getTime() <= now.getTime(),
    );
    if (stale.length === 0) return;

    for (const product of stale) {
      product.status = ProductStatus.EXPIRED;
      await this.productRepo.save(product);
      await auditService.log(product.ownerId, AuditAction.PRODUCT_EXPIRED, 'product', product.id);
    }
  }

  private resolveImageUrls(
    input: (CreateProductInput | CreateProductExpressInput) & {
      imageUrls?: string[];
      imageUrl?: string;
    },
  ) {
    if (input.imageUrls && input.imageUrls.length > 0) {
      return input.imageUrls.slice(0, env.maxProductImages);
    }
    if (input.imageUrl) {
      return [input.imageUrl];
    }
    return [];
  }

  private async saveProductImages(productId: string, imageUrls: string[]) {
    if (imageUrls.length === 0) return;
    const images = imageUrls.slice(0, env.maxProductImages).map((url, index) =>
      this.productImageRepo.create({
        productId,
        url,
        sortOrder: index,
      }),
    );
    await this.productImageRepo.save(images);
  }

  private getListingExpiryDate(from = new Date()) {
    const expiresAt = new Date(from);
    expiresAt.setDate(expiresAt.getDate() + env.listingDurationDays);
    return expiresAt;
  }
}
