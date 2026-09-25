import { z } from 'zod';

export const CropPlanIdParamSchema = z.object({
  farmId: z.string().uuid(),
  planId: z.string().uuid()
});

export const CropRecommendationSchema = z.object({
  cropName: z.string().min(1).max(100),
  suitability: z.enum(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']),
  waterRequirement: z.string().min(1).max(100),
  investment: z.object({
    min: z.number().nonnegative(),
    expected: z.number().nonnegative(),
    max: z.number().nonnegative()
  }),
  durationDays: z.number().int().positive(),
  yield: z.object({
    min: z.number().nonnegative(),
    expected: z.number().nonnegative(),
    max: z.number().nonnegative(),
    unit: z.string().min(1).max(30)
  }),
  revenue: z.object({
    min: z.number().nonnegative(),
    expected: z.number().nonnegative(),
    max: z.number().nonnegative(),
    currency: z.literal('INR')
  }),
  risk: z.enum(['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN']),
  reasoning: z.string().min(1).max(2000),
  tradeoffs: z.array(z.string().max(500)).max(10),
  assumptions: z.array(z.string().max(500)).max(10),
  confidence: z.number().min(0).max(100)
});

export const CropRecommendationsResponseSchema = z.object({
  recommendations: z.array(CropRecommendationSchema).min(1).max(5),
  missingInformation: z.array(z.string().max(500)).max(20),
  generalAssumptions: z.array(z.string().max(500)).max(20)
});

export const AnalyzeRequestSchema = z.object({
  preferences: z.object({
    lowerInvestment: z.boolean().optional(),
    lowerWaterUse: z.boolean().optional(),
    shorterDuration: z.boolean().optional(),
    lowerRisk: z.boolean().optional(),
    higherReturn: z.boolean().optional()
  }).optional().default({})
});
