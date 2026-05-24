import { AppDataSource } from '../../config/data-source';
import { env } from '../../config/env';
import { Product } from '../../entities/product.entity';
import { User } from '../../entities/user.entity';
import { Ad } from '../../entities/ad.entity';
import {
  MembershipTier,
  ProductStatus,
  AuditAction,
} from '../../types/enums';
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
  private userRepo = AppDataSource.getRepository(User);

  async create(ownerId: string, input: CreateProductInput) {
    await this.enforceFreeProductLimit(ownerId);

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
      status: ProductStatus.ACTIVE,
      imageUrl: (input as CreateProductInput & { imageUrl?: string }).imageUrl,
      availableToday: true,
    });

    await this.productRepo.save(product);
    const withOwner = await this.findByIdWithOwner(product.id);
    return toProductPublicDto(withOwner!);
  }

  /** Publicación express: 4 campos + defaults seguros de privacidad */
  async createExpress(ownerId: string, input: CreateProductExpressInput) {
    await trustService.assertCanPublish(ownerId);
    await this.enforceFreeProductLimit(ownerId);
    const needsPay = await listingCheckoutService.needsPayment(ownerId);
    const coords = getDistrictCoords(input.district);
    const exactAddress = `Zona ${input.district} (completar en chat)`;
    const { publicLat, publicLng } = fuzzCoordinates(coords.lat, coords.lng);

    const product = this.productRepo.create({
      title: input.title,
      description: `${input.title} — alquiler en ${input.district}. Contactar por chat.`,
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
      imageUrl: input.imageUrl || undefined,
      availableToday: input.availableToday ?? true,
    });

    await this.productRepo.save(product);
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
    const qb = this.productRepo
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.owner', 'owner')
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
    const product = await this.findByIdWithOwner(id);
    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND');
    }
    return toProductPublicDto(product);
  }

  async getMyProducts(ownerId: string) {
    const products = await this.productRepo.find({
      where: { ownerId },
      relations: { owner: true },
      order: { createdAt: 'DESC' },
    });

    return products.map((p) => ({
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
      relations: { owner: true },
    });
    if (!product) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND');
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
    if (input.status) product.status = input.status;

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

  private async enforceFreeProductLimit(ownerId: string) {
    const user = await this.userRepo.findOne({ where: { id: ownerId } });
    if (!user) {
      throw new AppError(404, 'User not found', 'NOT_FOUND');
    }

    const isPremium =
      user.membershipTier === MembershipTier.PREMIUM &&
      user.membershipExpiresAt &&
      user.membershipExpiresAt > new Date();

    if (isPremium) return;

    const activeCount = await this.productRepo.count({
      where: { ownerId, status: ProductStatus.ACTIVE },
    });

    if (activeCount >= env.freeProductLimit) {
      throw new AppError(
        403,
        `Free plan allows max ${env.freeProductLimit} active products. Upgrade to Premium.`,
        'FREE_LIMIT_REACHED',
      );
    }
  }

  private async findByIdWithOwner(id: string) {
    return this.productRepo.findOne({
      where: { id },
      relations: { owner: true },
    });
  }
}
