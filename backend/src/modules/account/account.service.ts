import { AppDataSource } from '../../config/data-source';
import { User } from '../../entities/user.entity';
import { Product } from '../../entities/product.entity';
import { ListingPayment } from '../../entities/listing-payment.entity';
import { MembershipPayment } from '../../entities/membership-payment.entity';
import { AdPayment } from '../../entities/ad-payment.entity';
import { ChatThread } from '../../entities/chat-thread.entity';
import { DealStatus, PaymentStatus, ProductStatus } from '../../types/enums';
import { AppError } from '../../middleware/error-handler';
import { env } from '../../config/env';
import { auditService } from '../../services/audit.service';
import { AuditAction, PaymentProvider } from '../../types/enums';

export class ListingCheckoutService {
  private userRepo = AppDataSource.getRepository(User);
  private productRepo = AppDataSource.getRepository(Product);
  private paymentRepo = AppDataSource.getRepository(ListingPayment);

  private getListingExpiryDate(from = new Date()) {
    const expiresAt = new Date(from);
    expiresAt.setDate(expiresAt.getDate() + env.listingDurationDays);
    return expiresAt;
  }

  private canUseFirstMonthFreeListing(user: User) {
    if (!env.firstListingFree) return false;
    if (!user.emailVerified || !user.phoneVerified || !user.kycVerified || !user.dniHash) {
      return false;
    }
    if (user.freeListingConsumedAt) return false;
    const ageInDays =
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays <= env.firstListingWindowDays;
  }

  async getListingDecision(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
    const freeListing = this.canUseFirstMonthFreeListing(user);
    return {
      user,
      freeListing,
      needsPayment: !freeListing,
      amountPen: env.listingFeePen,
      expiresAt: this.getListingExpiryDate(),
    };
  }

  async needsPayment(userId: string): Promise<boolean> {
    const decision = await this.getListingDecision(userId);
    return decision.needsPayment;
  }

  async consumeFreeListing(userId: string) {
    const { user, freeListing } = await this.getListingDecision(userId);
    if (!freeListing) return false;
    user.freeListingConsumedAt = new Date();
    await this.userRepo.save(user);
    return true;
  }

  async createListingPayment(userId: string, productId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.kycVerified || !user.phoneVerified || !user.emailVerified) {
      throw new AppError(403, 'Cuenta no verificada', 'NOT_VERIFIED');
    }

    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product || product.ownerId !== userId) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND');
    }
    if (product.status !== ProductStatus.PENDING_PAYMENT) {
      throw new AppError(400, 'Producto no requiere pago', 'INVALID_STATUS');
    }

    const forcePaidRepublish = Boolean(product.republishedFromId);
    const listingDecision = forcePaidRepublish
      ? {
          freeListing: false,
          needsPayment: true,
          amountPen: env.listingFeePen,
          expiresAt: this.getListingExpiryDate(),
        }
      : await this.getListingDecision(userId);
    if (!listingDecision.needsPayment) {
      await this.consumeFreeListing(userId);
      product.status = ProductStatus.ACTIVE;
      product.publishedAt = new Date();
      product.expiresAt = listingDecision.expiresAt;
      await this.productRepo.save(product);
      return {
        freeListing: true,
        productId,
        status: ProductStatus.ACTIVE,
        listingExpiresAt: product.expiresAt,
      };
    }
    if (!env.allowDevMocks) {
      throw new AppError(
        503,
        'Proveedor de pago aún no configurado para producción',
        'PAYMENT_PROVIDER_UNAVAILABLE',
      );
    }

    const amount = listingDecision.amountPen;
    const existingPending = await this.paymentRepo.findOne({
      where: { userId, productId, status: PaymentStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
    if (existingPending) {
      return {
        paymentId: existingPending.id,
        productId,
        amountPen: Number(existingPending.amountPen),
        qrPayload: existingPending.qrPayload,
        provider: 'YAPE_PLIN',
        expiresInMinutes: 15,
        status: existingPending.status,
      };
    }

    const payment = this.paymentRepo.create({
      userId,
      productId,
      amountPen: amount.toFixed(2),
      provider: PaymentProvider.MOCK,
      status: PaymentStatus.PENDING,
      qrPayload: env.yapePlinQrPayload,
      externalId: `listing_${Date.now()}`,
    });
    await this.paymentRepo.save(payment);

    await auditService.log(userId, AuditAction.LISTING_PAYMENT, 'listing_payment', payment.id, {
      productId,
      amount,
    });

    return {
      paymentId: payment.id,
      productId,
      amountPen: amount,
      qrPayload: payment.qrPayload,
      provider: 'YAPE_PLIN',
      expiresInMinutes: 15,
      status: PaymentStatus.PENDING,
    };
  }

  async confirmPayment(userId: string, paymentId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId, userId },
      relations: { product: true },
    });
    if (!payment) throw new AppError(404, 'Payment not found', 'NOT_FOUND');
    if (payment.status === PaymentStatus.COMPLETED) {
      return { status: PaymentStatus.COMPLETED, productId: payment.productId };
    }
    if (!env.allowDevMocks) {
      throw new AppError(
        403,
        'Los pagos en producción deben confirmarse por webhook del proveedor',
        'PAYMENT_WEBHOOK_REQUIRED',
      );
    }

    payment.status = PaymentStatus.COMPLETED;
    payment.paidAt = new Date();
    await this.paymentRepo.save(payment);

    const product = payment.product;
    product.status = ProductStatus.ACTIVE;
    product.publishedAt = new Date();
    product.expiresAt = this.getListingExpiryDate();
    await this.productRepo.save(product);

    await auditService.log(userId, AuditAction.LISTING_PAYMENT, 'listing_payment', payment.id, {
      confirmed: true,
    });

    return {
      status: PaymentStatus.COMPLETED,
      productId: payment.productId,
      paidAt: payment.paidAt,
      listingExpiresAt: product.expiresAt,
    };
  }

  async getPaymentStatus(userId: string, paymentId: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId, userId } });
    if (!payment) throw new AppError(404, 'Payment not found', 'NOT_FOUND');
    return {
      id: payment.id,
      status: payment.status,
      productId: payment.productId,
      amountPen: payment.amountPen,
      paidAt: payment.paidAt,
    };
  }
}

export class AccountService {
  private userRepo = AppDataSource.getRepository(User);
  private productRepo = AppDataSource.getRepository(Product);
  private listingPaymentRepo = AppDataSource.getRepository(ListingPayment);
  private membershipPaymentRepo = AppDataSource.getRepository(MembershipPayment);
  private adPaymentRepo = AppDataSource.getRepository(AdPayment);
  private threadRepo = AppDataSource.getRepository(ChatThread);

  async summary(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

    const products = await this.productRepo.count({
      where: { ownerId: userId, status: ProductStatus.ACTIVE },
    });
    const dealsAsOwner = await this.threadRepo.count({
      where: { ownerId: userId, dealStatus: DealStatus.CLOSED },
    });
    const dealsAsTenant = await this.threadRepo.count({
      where: { tenantId: userId, dealStatus: DealStatus.CLOSED },
    });
    const paidListings = await this.listingPaymentRepo.count({
      where: { userId, status: PaymentStatus.COMPLETED },
    });
    const superPromos = await this.adPaymentRepo.count({
      where: { userId, status: PaymentStatus.COMPLETED },
    });
    const listingRevenue = await this.listingPaymentRepo.find({
      where: { userId, status: PaymentStatus.COMPLETED },
    });
    const superPromoRevenue = await this.adPaymentRepo.find({
      where: { userId, status: PaymentStatus.COMPLETED },
    });
    const totalRevenue =
      listingRevenue.reduce((sum, payment) => sum + Number(payment.amountPen), 0) +
      superPromoRevenue.reduce((sum, payment) => sum + Number(payment.amountPen), 0);

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      kycStatus: user.kycStatus,
      kycVerified: user.kycVerified,
      kycVerifiedAt: user.kycVerifiedAt,
      phoneVerified: user.phoneVerified,
      membershipTier: user.membershipTier,
      membershipExpiresAt: user.membershipExpiresAt,
      commerce: {
        freeListingConsumed: Boolean(user.freeListingConsumedAt),
        freeListingConsumedAt: user.freeListingConsumedAt,
        paidListings,
        superPromos,
        totalRevenuePen: totalRevenue,
      },
      stats: {
        products,
        dealsClosed: dealsAsOwner + dealsAsTenant,
        dealsAsOwner,
        dealsAsTenant,
      },
    };
  }

  async payments(userId: string) {
    const listing = await this.listingPaymentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const membership = await this.membershipPaymentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return {
      listing: listing.map((p) => ({
        id: p.id,
        type: 'LISTING' as const,
        amountPen: p.amountPen,
        status: p.status,
        productId: p.productId,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      })),
      membership: membership.map((p) => ({
        id: p.id,
        type: 'MEMBERSHIP' as const,
        plan: p.plan,
        amountPen: p.amountPen,
        status: p.status,
        createdAt: p.createdAt,
      })),
    };
  }

  async deals(userId: string) {
    const threads = await this.threadRepo.find({
      where: [{ ownerId: userId }, { tenantId: userId }],
      relations: { product: true, owner: true, tenant: true },
      order: { closedAt: 'DESC' },
      take: 50,
    });

    return threads
      .filter((t) => t.dealStatus === DealStatus.CLOSED)
      .map((t) => ({
        id: t.id,
        productTitle: t.product?.title,
        role: t.ownerId === userId ? 'OWNER' : 'TENANT',
        otherName: t.ownerId === userId ? t.tenant.displayName : t.owner.displayName,
        agreedPrice: t.agreedPrice,
        closedAt: t.closedAt,
      }));
  }

  async products(userId: string) {
    const items = await this.productRepo.find({
      where: { ownerId: userId },
      order: { createdAt: 'DESC' },
    });
    return items
      .filter((p) => p.status !== ProductStatus.DELETED)
      .map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      pricePerDay: p.pricePerDay,
      district: p.district,
      createdAt: p.createdAt,
    }));
  }
}

export const listingCheckoutService = new ListingCheckoutService();
export const accountService = new AccountService();
