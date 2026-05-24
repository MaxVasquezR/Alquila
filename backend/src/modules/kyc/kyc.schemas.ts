import { z } from 'zod';

export const completeKycSchema = z.object({
  dni: z.string().regex(/^\d{8}$/, 'DNI debe tener 8 dígitos'),
  legalName: z.string().min(5).max(120),
  avatarUrl: z.string().url().optional(),
  approved: z.boolean().optional(),
});

export const kycWebhookSchema = z.object({
  sessionId: z.string(),
  status: z.enum(['approved', 'rejected']),
  dni: z.string().optional(),
  legalName: z.string().optional(),
  avatarUrl: z.string().optional(),
});
