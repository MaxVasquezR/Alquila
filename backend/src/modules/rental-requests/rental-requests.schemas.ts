import { z } from 'zod';
import { isValidLimaDistrict } from '../../data/lima-districts';

export const createRentalRequestSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(1000),
  category: z.string().min(2).max(60),
  district: z
    .string()
    .refine(isValidLimaDistrict, { message: 'Distrito no válido' }),
  neededBy: z.string().datetime(),
});

export type CreateRentalRequestInput = z.infer<typeof createRentalRequestSchema>;
