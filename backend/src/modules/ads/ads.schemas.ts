import { z } from 'zod';
import { AdPlan } from '../../types/enums';

export const adCheckoutSchema = z.object({
  productId: z.string().uuid(),
  plan: z.nativeEnum(AdPlan).default(AdPlan.SUPER_PROMO_7),
});

export type AdCheckoutInput = z.infer<typeof adCheckoutSchema>;
