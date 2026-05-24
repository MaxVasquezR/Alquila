import { z } from 'zod';
import { isValidLimaDistrict } from '../../data/lima-districts';
import { isValidCategory } from '../../data/market-categories';
import { ProductStatus } from '../../types/enums';

const districtSchema = z
  .string()
  .refine(isValidLimaDistrict, { message: 'Distrito no válido en Lima Metropolitana' });

const categorySchema = z
  .string()
  .refine(isValidCategory, { message: 'Categoría no válida' });

export const createProductExpressSchema = z.object({
  title: z.string().min(3).max(120),
  category: categorySchema,
  pricePerDay: z.coerce.number().positive(),
  district: districtSchema,
  imageUrl: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  availableToday: z.boolean().default(true),
  locationReference: z.string().max(100).optional(),
});

export const createProductSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  category: z.string().min(2).max(60),
  pricePerDay: z.number().positive(),
  pricePerHour: z.number().positive().optional(),
  district: districtSchema,
  locationReference: z.string().max(100).optional(),
  exactAddress: z.string().min(5).max(300),
  exactLat: z.number().min(-13.5).max(-11.5),
  exactLng: z.number().min(-77.5).max(-76.5),
});

export const updateProductSchema = createProductSchema.partial().extend({
  status: z.nativeEnum(ProductStatus).optional(),
});

export const listProductsQuerySchema = z.object({
  district: z
    .string()
    .optional()
    .refine((d) => !d || isValidLimaDistrict(d), {
      message: 'Distrito no válido',
    }),
  category: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  availableToday: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  sort: z.enum(['price_asc', 'price_desc', 'newest']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateProductExpressInput = z.infer<typeof createProductExpressSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
