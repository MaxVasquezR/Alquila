import { z } from 'zod';
import { UserRole } from '../../types/enums';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(50),
  phone: z.string().min(9).max(15),
  role: z.nativeEnum(UserRole).default(UserRole.BOTH),
  acceptTerms: z.literal(true, {
    message: 'Debes aceptar los términos y condiciones',
  }),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const otpSendSchema = z.object({
  phone: z.string().min(9).max(15),
});

export const otpVerifySchema = z.object({
  phone: z.string().min(9).max(15),
  code: z.string().length(6),
});
