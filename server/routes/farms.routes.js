import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import { FarmSchema, UpdateFarmSchema, FarmIdParamSchema } from '../validation/farm.schema.js';
import { AnalyzeRequestSchema, CropPlanIdParamSchema } from '../validation/crop.schema.js';
import { CreateBusinessPlanSchema, BusinessPlanIdParamSchema } from '../validation/business.schema.js';
import { CreateCropCycleSchema, UpdateCropCycleSchema, CycleIdParamSchema } from '../validation/cropCycle.schema.js';
import { CreateExpenseSchema, UpdateExpenseSchema, ExpenseQuerySchema, ExpenseIdParamSchema } from '../validation/expense.schema.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

import { getUserFarms, getFarmById, createFarm, updateFarm, deleteFarm } from '../services/farm.service.js';
import { generateCropRecommendations, getFarmCropPlans, getCropPlanById } from '../services/crop.service.js';
import { calculateAndCreateBusinessPlan, getFarmBusinessPlans, getBusinessPlanById } from '../services/business.service.js';
import { createCropCycle, getFarmCropCycles, getCropCycleById, updateCropCycle, deleteCropCycle } from '../services/cropCycle.service.js';
import { createExpense, getFarmExpenses, updateExpense, deleteExpense } from '../services/expense.service.js';
import { getFarmWeather, generateWeatherAction } from '../services/weather.service.js';
import { getFarmSchemes } from '../services/scheme.service.js';

const router = Router();

// All farm routes require authentication
router.use(requireAuth);

// Farms CRUD
router.get('/', async (req, res, next) => {
  try {
    const farms = await getUserFarms(req.user.id);
    res.json({ success: true, data: { farms } });
  } catch (err) {
    next(err);
  }
});

router.post('/', validateBody(FarmSchema), async (req, res, next) => {
  try {
    const farm = await createFarm(req.user.id, req.body);
    res.status(201).json({ success: true, data: { farm } });
  } catch (err) {
    next(err);
  }
});

router.get('/:farmId', validateParams(FarmIdParamSchema), async (req, res, next) => {
  try {
    const farm = await getFarmById(req.params.farmId, req.user.id);
    res.json({ success: true, data: { farm } });
  } catch (err) {
    next(err);
  }
});

router.patch('/:farmId', validateParams(FarmIdParamSchema), validateBody(UpdateFarmSchema), async (req, res, next) => {
  try {
    const farm = await updateFarm(req.params.farmId, req.user.id, req.body);
    res.json({ success: true, data: { farm } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:farmId', validateParams(FarmIdParamSchema), async (req, res, next) => {
  try {
    const result = await deleteFarm(req.params.farmId, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Farm Analysis & Crop Planning
router.post('/:farmId/analyze', aiLimiter, validateParams(FarmIdParamSchema), validateBody(AnalyzeRequestSchema), async (req, res, next) => {
  try {
    const result = await generateCropRecommendations(req.params.farmId, req.user.id, req.body.preferences);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:farmId/crop-plans', validateParams(FarmIdParamSchema), async (req, res, next) => {
  try {
    const cropPlans = await getFarmCropPlans(req.params.farmId, req.user.id);
    res.json({ success: true, data: { cropPlans } });
  } catch (err) {
    next(err);
  }
});

router.get('/:farmId/crop-plans/:planId', validateParams(CropPlanIdParamSchema), async (req, res, next) => {
  try {
    const cropPlan = await getCropPlanById(req.params.farmId, req.params.planId, req.user.id);
    res.json({ success: true, data: { cropPlan } });
  } catch (err) {
    next(err);
  }
});

// Business Plans
router.post('/:farmId/business-plans', validateParams(FarmIdParamSchema), validateBody(CreateBusinessPlanSchema), async (req, res, next) => {
  try {
    const businessPlan = await calculateAndCreateBusinessPlan(req.params.farmId, req.user.id, req.body);
    res.status(201).json({ success: true, data: { businessPlan } });
  } catch (err) {
    next(err);
  }
});

router.get('/:farmId/business-plans', validateParams(FarmIdParamSchema), async (req, res, next) => {
  try {
    const businessPlans = await getFarmBusinessPlans(req.params.farmId, req.user.id);
    res.json({ success: true, data: { businessPlans } });
  } catch (err) {
    next(err);
  }
});

router.get('/:farmId/business-plans/:planId', validateParams(BusinessPlanIdParamSchema), async (req, res, next) => {
  try {
    const businessPlan = await getBusinessPlanById(req.params.farmId, req.params.planId, req.user.id);
    res.json({ success: true, data: { businessPlan } });
  } catch (err) {
    next(err);
  }
});

// Crop Cycles
router.get('/:farmId/crop-cycles', validateParams(FarmIdParamSchema), async (req, res, next) => {
  try {
    const cropCycles = await getFarmCropCycles(req.params.farmId, req.user.id);
    res.json({ success: true, data: { cropCycles } });
  } catch (err) {
    next(err);
  }
});

router.post('/:farmId/crop-cycles', validateParams(FarmIdParamSchema), validateBody(CreateCropCycleSchema), async (req, res, next) => {
  try {
    const cropCycle = await createCropCycle(req.params.farmId, req.user.id, req.body);
    res.status(201).json({ success: true, data: { cropCycle } });
  } catch (err) {
    next(err);
  }
});

router.get('/:farmId/crop-cycles/:cycleId', validateParams(CycleIdParamSchema), async (req, res, next) => {
  try {
    const cropCycle = await getCropCycleById(req.params.farmId, req.params.cycleId, req.user.id);
    res.json({ success: true, data: { cropCycle } });
  } catch (err) {
    next(err);
  }
});

router.patch('/:farmId/crop-cycles/:cycleId', validateParams(CycleIdParamSchema), validateBody(UpdateCropCycleSchema), async (req, res, next) => {
  try {
    const cropCycle = await updateCropCycle(req.params.farmId, req.params.cycleId, req.user.id, req.body);
    res.json({ success: true, data: { cropCycle } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:farmId/crop-cycles/:cycleId', validateParams(CycleIdParamSchema), async (req, res, next) => {
  try {
    const result = await deleteCropCycle(req.params.farmId, req.params.cycleId, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Expenses
router.get('/:farmId/expenses', validateParams(FarmIdParamSchema), validateQuery(ExpenseQuerySchema), async (req, res, next) => {
  try {
    const result = await getFarmExpenses(req.params.farmId, req.user.id, req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/:farmId/expenses', validateParams(FarmIdParamSchema), validateBody(CreateExpenseSchema), async (req, res, next) => {
  try {
    const expense = await createExpense(req.params.farmId, req.user.id, req.body);
    res.status(201).json({ success: true, data: { expense } });
  } catch (err) {
    next(err);
  }
});

router.patch('/:farmId/expenses/:expenseId', validateParams(ExpenseIdParamSchema), validateBody(UpdateExpenseSchema), async (req, res, next) => {
  try {
    const expense = await updateExpense(req.params.farmId, req.params.expenseId, req.user.id, req.body);
    res.json({ success: true, data: { expense } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:farmId/expenses/:expenseId', validateParams(ExpenseIdParamSchema), async (req, res, next) => {
  try {
    const result = await deleteExpense(req.params.farmId, req.params.expenseId, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Weather & Weather Action
router.get('/:farmId/weather', validateParams(FarmIdParamSchema), async (req, res, next) => {
  try {
    const weather = await getFarmWeather(req.params.farmId, req.user.id);
    res.json({ success: true, data: { weather } });
  } catch (err) {
    next(err);
  }
});

router.post('/:farmId/weather-action', aiLimiter, validateParams(FarmIdParamSchema), async (req, res, next) => {
  try {
    const weatherAction = await generateWeatherAction(req.params.farmId, req.user.id);
    res.json({ success: true, data: { weatherAction } });
  } catch (err) {
    next(err);
  }
});

// Government Support
router.get('/:farmId/schemes', validateParams(FarmIdParamSchema), async (req, res, next) => {
  try {
    const schemes = await getFarmSchemes(req.params.farmId, req.user.id);
    res.json({ success: true, data: { schemes } });
  } catch (err) {
    next(err);
  }
});

export default router;
