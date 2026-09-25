import { z } from 'zod';

export const CreateBusinessPlanSchema = z.object({
  cropPlanId: z.string().uuid().optional().nullable(),
  cropName: z.string().trim().min(1).max(100),
  landAreaAcres: z.coerce.number().positive().max(10000),
  durationDays: z.coerce.number().int().positive(),
  // Optional custom cost multipliers or custom input costs
  customBreakdown: z.object({
    seeds: z.number().nonnegative().optional(),
    fertilizer: z.number().nonnegative().optional(),
    labour: z.number().nonnegative().optional(),
    irrigation: z.number().nonnegative().optional(),
    pestManagement: z.number().nonnegative().optional(),
    machinery: z.number().nonnegative().optional(),
    transport: z.number().nonnegative().optional(),
    other: z.number().nonnegative().optional()
  }).optional()
});

export const BusinessPlanIdParamSchema = z.object({
  farmId: z.string().uuid(),
  planId: z.string().uuid()
});
