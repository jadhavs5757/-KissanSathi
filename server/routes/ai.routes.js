import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.js';
import { AssistantRequestSchema, AiHistoryQuerySchema } from '../validation/ai.schema.js';
import { z } from 'zod';
import { askAssistant, getUserAiHistory, getAiHistoryById } from '../services/ai.service.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(requireAuth);

const HistoryIdParamSchema = z.object({
  historyId: z.string().uuid()
});

router.post('/assistant', aiLimiter, validateBody(AssistantRequestSchema), async (req, res, next) => {
  try {
    const result = await askAssistant({
      userId: req.user.id,
      farmId: req.body.farmId,
      cropCycleId: req.body.cropCycleId,
      message: req.body.message,
      preferredLanguage: req.body.preferredLanguage || req.user.preferred_language || 'en'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

router.get('/history', validateQuery(AiHistoryQuerySchema), async (req, res, next) => {
  try {
    const history = await getUserAiHistory(req.user.id, req.query);
    res.json({
      success: true,
      data: history
    });
  } catch (err) {
    next(err);
  }
});

router.get('/history/:historyId', validateParams(HistoryIdParamSchema), async (req, res, next) => {
  try {
    const record = await getAiHistoryById(req.params.historyId, req.user.id);
    res.json({
      success: true,
      data: { record }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
