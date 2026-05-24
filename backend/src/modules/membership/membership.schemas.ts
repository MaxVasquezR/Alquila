import { z } from 'zod';
import { MembershipPlan } from '../../types/enums';

export const checkoutSchema = z.object({
  plan: z.nativeEnum(MembershipPlan),
  paymentToken: z.string().min(1),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const PLAN_PRICES: Record<MembershipPlan, number> = {
  [MembershipPlan.PREMIUM_19]: 19.9,
  [MembershipPlan.PREMIUM_29]: 29.9,
};
