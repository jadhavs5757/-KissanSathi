import { z } from 'zod';

export const CycleIdParamSchema = z.object({
  farmId: z.string().uuid().optional(),
  cycleId: z.string().uuid()
});

export const CreateCropCycleSchema = z.object({
  cropPlanId: z.string().uuid().optional().nullable(),
  cropName: z.string().trim().min(1).max(100),
  variety: z.string().trim().max(100).optional().nullable(),
  areaAcres: z.coerce.number().positive().max(10000),
  plantingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  expectedDurationDays: z.coerce.number().int().positive(),
  currentStage: z.enum([
    'PLANTING',
    'GERMINATION',
    'EARLY_GROWTH',
    'VEGETATIVE',
    'FLOWERING',
    'FRUITING',
    'MATURATION',
    'HARVEST'
  ]).default('PLANTING'),
  status: z.enum(['PLANNED', 'ACTIVE', 'HARVESTED', 'CANCELLED']).default('ACTIVE')
});

export const UpdateCropCycleSchema = z.object({
  variety: z.string().trim().max(100).optional().nullable(),
  currentStage: z.enum([
    'PLANTING',
    'GERMINATION',
    'EARLY_GROWTH',
    'VEGETATIVE',
    'FLOWERING',
    'FRUITING',
    'MATURATION',
    'HARVEST'
  ]).optional(),
  status: z.enum(['PLANNED', 'ACTIVE', 'HARVESTED', 'CANCELLED']).optional(),
  expectedDurationDays: z.coerce.number().int().positive().optional()
});

export const CreateObservationSchema = z.object({
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(1000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN']).default('LOW'),
  observationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});
