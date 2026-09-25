import { Router } from 'express';
import { validateBody } from '../middleware/validation.js';
import { RegisterSchema, LoginSchema } from '../validation/auth.schema.js';
import { registerUser, loginUser, getUserById } from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, validateBody(RegisterSchema), async (req, res, next) => {
  try {
    const { user, token } = await registerUser(req.body);

    // Set secure HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      success: true,
      data: { user, token }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, validateBody(LoginSchema), async (req, res, next) => {
  try {
    const { user, token } = await loginUser(req.body);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      data: { user, token }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', requireAuth, (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

router.get('/me', requireAuth, async (req, res, next) => {
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

export default router;
