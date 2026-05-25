import { AppDataSource } from '../../config/data-source';
import { Ad } from '../../entities/ad.entity';
import { AdPayment } from '../../entities/ad-payment.entity';
import { Product } from '../../entities/product.entity';
import { AdCheckoutInput } from './ads.schemas';
import { AppError } from '../../middleware/error-handler';
import { auditService } from '../../services/audit.service';
import {
  AdPlan,
  AdPlacement,
  AuditAction,
  PaymentProvider,
  PaymentStatus,
  ProductStatus,
} from '../../types/enums';
import { env } from '../../config/env';
import { toProductPublicDto } from '../products/product.public-mapper';

export class AdsService {
  private adRepo = AppDataSource.getRepository(Ad);
  private adPaymentRepo = AppDataSource.getRepository(AdPayment);
  private productRepo = AppDataSource.getRepository(Product);

  async getFeatured() {
    await this.syncExpiredAds();
    const now = new Date();
    const ads = await this.adRepo
      .createQueryBuilder('ad')
      .innerJoinAndSelect('ad.product', 'product')
      .innerJoinAndSelect('product.owner', 'owner')
      .where('ad.isActive = true')
      .andWhere('ad.startsAt <= :now', { now })
      .andWhere('ad.endsAt >= :now', { now })
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .orderBy('ad.startsAt', 'DESC')
      .getMany();

    return {
      data: ads.map((ad) =>
        toProductPublicDto(ad.product, {
          isFeatured: true,
          promotionLabel: 'Super Promo',
        }),
      ),
    };
  }

  async createCheckout(userId: string, input: AdCheckoutInput) {
    await this.syncExpiredAds();
    const product = await this.productRepo.findOne({ where: { id: input.productId } });
    if (!product || product.ownerId !== userId) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND');
    }
    if (product.status !== ProductStatus.ACTIVE) {
      throw new AppError(
        400,
        'La publicación debe estar activa antes de impulsar',
        'INVALID_STATUS',
      );
    }

    const activeAd = await this.adRepo.findOne({
      where: { productId: input.productId, isActive: true },
    });
    if (activeAd && activeAd.endsAt > new Date()) {
      throw new AppError(409, 'La publicación ya tiene Super Promo activa', 'PROMO_ACTIVE');
    }
    if (!env.allowDevMocks) {
      throw new AppError(
        503,
        'Proveedor de pago aún no configurado para producción',
        'PAYMENT_PROVIDER_UNAVAILABLE',
      );
    }

    const payment = this.adPaymentRepo.create({
      userId,
      productId: input.productId,
      plan: input.plan,
      amountPen: env.superPromoFeePen.toFixed(2),
      provider: PaymentProvider.MOCK,
      status: PaymentStatus.PENDING,
      qrPayload: env.yapePlinQrPayload,
      externalId: `superpromo_${Date.now()}`,
    });
    await this.adPaymentRepo.save(payment);

    return {
      paymentId: payment.id,
      productId: input.productId,
      plan: input.plan,
      amountPen: env.superPromoFeePen,
      qrPayload: payment.qrPayload,
      expiresInMinutes: 15,
      status: payment.status,
      durationDays: env.superPromoDurationDays,
    };
  }

  async confirmCheckout(userId: string, paymentId: string) {
    await this.syncExpiredAds();
    const payment = await this.adPaymentRepo.findOne({
      where: { id: paymentId, userId },
    });
    if (!payment) throw new AppError(404, 'Payment not found', 'NOT_FOUND');
    if (payment.status === PaymentStatus.COMPLETED) {
      return {
        status: payment.status,
        productId: payment.productId,
      };
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
    await this.adPaymentRepo.save(payment);

    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + env.superPromoDurationDays);
    const ad = this.adRepo.create({
      productId: payment.productId,
      startsAt,
      endsAt,
      placement: AdPlacement.HOME_FEED,
      isActive: true,
    });
    await this.adRepo.save(ad);
    await auditService.log(userId, AuditAction.SUPER_PROMO_PURCHASED, 'product', payment.productId, {
      paymentId: payment.id,
      plan: payment.plan,
    });

    return {
      status: payment.status,
      productId: payment.productId,
      paidAt: payment.paidAt,
      promoEndsAt: endsAt,
    };
  }

  private async syncExpiredAds() {
    const now = new Date();
    const expiredAds = await this.adRepo
      .createQueryBuilder('ad')
      .where('ad.isActive = true')
      .andWhere('ad.endsAt < :now', { now })
      .getMany();

    if (expiredAds.length === 0) return;
    for (const ad of expiredAds) {
      ad.isActive = false;
      await this.adRepo.save(ad);
    }
  }
}
