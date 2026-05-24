import { AppDataSource } from '../../config/data-source';
import { User } from '../../entities/user.entity';
import { MembershipPayment } from '../../entities/membership-payment.entity';
import {
  MembershipTier,
  PaymentProvider,
  PaymentStatus,
} from '../../types/enums';
import { AppError } from '../../middleware/error-handler';
import { CheckoutInput, PLAN_PRICES } from './membership.schemas';

/** Interfaz para integrar Culqi / Mercado Pago en fase 2 */
export interface PaymentProviderAdapter {
  charge(token: string, amount: number): Promise<{ externalId: string }>;
}

class MockPaymentProvider implements PaymentProviderAdapter {
  async charge(token: string, amount: number) {
    if (token === 'fail') {
      throw new AppError(402, 'Payment declined', 'PAYMENT_DECLINED');
    }
    return { externalId: `mock_${Date.now()}_${amount}` };
  }
}

export class MembershipService {
  private userRepo = AppDataSource.getRepository(User);
  private paymentRepo = AppDataSource.getRepository(MembershipPayment);
  private provider: PaymentProviderAdapter = new MockPaymentProvider();

  async checkout(userId: string, input: CheckoutInput) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, 'User not found', 'NOT_FOUND');
    }

    const amount = PLAN_PRICES[input.plan];
    const payment = this.paymentRepo.create({
      userId,
      plan: input.plan,
      amountPen: amount.toFixed(2),
      provider: PaymentProvider.MOCK,
      status: PaymentStatus.PENDING,
    });
    await this.paymentRepo.save(payment);

    try {
      const result = await this.provider.charge(
        input.paymentToken,
        amount,
      );
      payment.status = PaymentStatus.COMPLETED;
      payment.externalId = result.externalId;
      await this.paymentRepo.save(payment);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      user.membershipTier = MembershipTier.PREMIUM;
      user.membershipExpiresAt = expiresAt;
      await this.userRepo.save(user);

      return {
        paymentId: payment.id,
        status: payment.status,
        plan: input.plan,
        amountPen: amount,
        membershipTier: user.membershipTier,
        membershipExpiresAt: user.membershipExpiresAt,
      };
    } catch (err) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment);
      throw err;
    }
  }
}
