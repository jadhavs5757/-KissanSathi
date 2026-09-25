import { z } from 'zod';

export const FarmIdParamSchema = z.object({
  farmId: z.string().uuid('Invalid farm ID format')
});

export const FarmSchema = z.object({
  name: z.string().trim().min(1, 'Farm name is required').max(100),
  location: z.string().trim().min(1, 'Location is required').max(200),
  land_area_acres: z.coerce.number().positive('Land area must be greater than 0').max(10000),
  ownership: z.enum(['OWN', 'LEASE']),
  previous_crop: z.string().trim().max(100).optional().nullable(),
  soil_source: z.enum(['SOIL_HEALTH_CARD', 'LAB_TEST', 'USER_ENTERED', 'UNKNOWN']).default('UNKNOWN'),
  soil_type: z.string().trim().max(100).optional().nullable(),
  soil_ph: z.coerce.number().min(0).max(14).optional().nullable(),
  nitrogen: z.coerce.number().nonnegative().optional().nullable(),
  phosphorus: z.coerce.number().nonnegative().optional().nullable(),
  potassium: z.coerce.number().nonnegative().optional().nullable(),
  organic_carbon: z.coerce.number().nonnegative().optional().nullable(),
  water_source: z.enum([
    'BOREWELL',
    'OPEN_WELL',
    'CANAL',
    'RIVER',
    'TANK',
    'RAINFED',
    'COMBINATION'
  ]),
  pump_capacity_hp: z.coerce.number().nonnegative().optional().nullable(),
  water_hours_per_day: z.coerce.number().min(0).max(24).optional().nullable(),
  irrigation_method: z.string().trim().max(100).optional().nullable(),
  rain_dependence_percent: z.coerce.number().min(0).max(100).optional().nullable(),
  capital_budget: z.coerce.number().nonnegative('Budget must be positive or 0'),
  labour_description: z.string().trim().max(500).optional().nullable(),
  equipment_description: z.string().trim().max(500).optional().nullable(),
  storage_available: z.boolean().default(false),
  electricity_available: z.boolean().default(false)
});

export const UpdateFarmSchema = FarmSchema.partial();
