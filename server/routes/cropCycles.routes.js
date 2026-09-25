import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { CreateTaskSchema, UpdateTaskSchema, TaskIdParamSchema } from '../validation/task.schema.js';
import { CreateObservationSchema, CycleIdParamSchema } from '../validation/cropCycle.schema.js';
import {
  getCycleTasks,
  createCycleTask,
  updateCycleTask,
  getCycleObservations,
  addCycleObservation
} from '../services/cropCycle.service.js';

const router = Router();

router.use(requireAuth);

// Tasks
router.get('/:cycleId/tasks', validateParams(CycleIdParamSchema), async (req, res, next) => {
  try {
    const tasks = await getCycleTasks(req.params.cycleId, req.user.id);
    res.json({ success: true, data: { tasks } });
  } catch (err) {
    next(err);
  }
});

router.post('/:cycleId/tasks', validateParams(CycleIdParamSchema), validateBody(CreateTaskSchema), async (req, res, next) => {
  try {
    const task = await createCycleTask(req.params.cycleId, req.user.id, req.body);
    res.status(201).json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
});

router.patch('/:cycleId/tasks/:taskId', validateParams(TaskIdParamSchema), validateBody(UpdateTaskSchema), async (req, res, next) => {
  try {
    const task = await updateCycleTask(req.params.cycleId, req.params.taskId, req.user.id, req.body);
    res.json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
});

// Observations
router.get('/:cycleId/observations', validateParams(CycleIdParamSchema), async (req, res, next) => {
  try {
    const observations = await getCycleObservations(req.params.cycleId, req.user.id);
    res.json({ success: true, data: { observations } });
  } catch (err) {
    next(err);
  }
});

router.post('/:cycleId/observations', validateParams(CycleIdParamSchema), validateBody(CreateObservationSchema), async (req, res, next) => {
  try {
    const observation = await addCycleObservation(req.params.cycleId, req.user.id, req.body);
    res.status(201).json({ success: true, data: { observation } });
  } catch (err) {
    next(err);
  }
});

export default router;
