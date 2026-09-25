import { z } from 'zod';

export const WeatherActionSchema = z.object({
  summary: z.string().min(1).max(1000),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN']),
  actions: z.array(z.object({
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    action: z.string().min(1).max(500),
    reason: z.string().min(1).max(500)
  })).min(1).max(10),
  uncertainties: z.array(z.string().max(500)).max(10).default([]),
  confidence: z.number().min(0).max(100)
});

export const CropAdvisorySchema = z.object({
  summary: z.string().min(1).max(1000),
  currentStage: z.enum([
    'PLANTING',
    'GERMINATION',
    'EARLY_GROWTH',
    'VEGETATIVE',
    'FLOWERING',
    'FRUITING',
    'MATURATION',
    'HARVEST'
  ]),
  actions: z.array(z.object({
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    action: z.string().min(1).max(500),
    reason: z.string().min(1).max(500)
  })).min(1).max(10),
  risks: z.array(z.string().max(500)).max(10).default([]),
  missingInformation: z.array(z.string().max(500)).max(10).default([]),
  confidence: z.number().min(0).max(100)
});

export const SchemeGuidanceSchema = z.object({
  schemes: z.array(z.object({
    name: z.string().min(1).max(200),
    status: z.string().min(1).max(100).default('CHECK_ELIGIBILITY'),
    whyRelevant: z.string().min(1).max(1000),
    eligibilityRequirements: z.array(z.string().max(500)).default([]),
    documents: z.array(z.string().max(500)).default([]),
    applicationRoute: z.string().max(1000).default('Verify through the applicable official channel.'),
    officialSourceUrl: z.string().nullable().default(null),
    lastVerifiedAt: z.string().nullable().default(null)
  })).min(1).max(10)
});

export const GeneralAssistantSchema = z.object({
  answer: z.string().min(1).max(4000),
  actions: z.array(z.object({
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    action: z.string().min(1).max(500),
    reason: z.string().min(1).max(500)
  })).default([]),
  assumptions: z.array(z.string().max(500)).default([]),
  missingInformation: z.array(z.string().max(500)).default([]),
  confidence: z.number().min(0).max(100)
});

export const AssistantRequestSchema = z.object({
  farmId: z.string().uuid().optional().nullable(),
  cropCycleId: z.string().uuid().optional().nullable(),
  message: z.string().trim().min(2, 'Message must be at least 2 characters').max(1000, 'Message cannot exceed 1000 characters')
});

export const AiHistoryQuerySchema = z.object({
  featureType: z.enum([
    'CROP_RECOMMENDATION',
    'BUSINESS_PLAN',
    'WEATHER_ACTION',
    'CROP_ADVISORY',
    'SCHEME_GUIDANCE',
    'GENERAL_FARM_ASSISTANT'
  ]).optional(),
  farmId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20)
});
