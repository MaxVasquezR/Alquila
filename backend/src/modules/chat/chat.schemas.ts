import { z } from 'zod';
import { ChatMessageType, DealCheckpointStage, DealStatus } from '../../types/enums';

export const createThreadSchema = z.object({
  productId: z.string().uuid(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.nativeEnum(ChatMessageType).default(ChatMessageType.TEXT),
  questionnaire: z
    .object({
      moveInDate: z.string().min(1),
      hasVerifiedDni: z.boolean().optional(),
    })
    .optional(),
});

export const updateDealStatusSchema = z.object({
  dealStatus: z.nativeEnum(DealStatus),
  agreedPrice: z.number().positive().optional(),
});

export const ownerConfirmDealSchema = z.object({
  agreedPrice: z.number().positive().optional(),
});

export const repeatContactSchema = z.object({
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
});

export const submitCheckpointSchema = z.object({
  stage: z.nativeEnum(DealCheckpointStage),
  notes: z.string().max(500).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type UpdateDealStatusInput = z.infer<typeof updateDealStatusSchema>;
export type SubmitCheckpointInput = z.infer<typeof submitCheckpointSchema>;
