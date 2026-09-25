import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { UpdateProfileSchema } from '../validation/auth.schema.js';
import { getUserById, updateUserProfile } from '../services/auth.service.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id);
    res.json({
      success: true,
      data: { user }
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/', validateBody(UpdateProfileSchema), async (req, res, next) => {
  try {
    const updated = await updateUserProfile(req.user.id, req.body);
    res.json({
      success: true,
      data: { user: updated }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
