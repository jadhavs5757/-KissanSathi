import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAllSchemes } from '../services/scheme.service.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const schemes = await getAllSchemes();
    res.json({
      success: true,
      data: { schemes }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
