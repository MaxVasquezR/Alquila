import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import {
  registerSchema,
  loginSchema,
  otpSendSchema,
  otpVerifySchema,
  emailVerifySchema,
} from './auth.schemas';
import { AuthService } from './auth.service';
import { otpService } from './otp.service';

const router = Router();
const authService = new AuthService();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, try again later' },
});

router.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/otp/send',
  authMiddleware,
  authLimiter,
  validateBody(otpSendSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await otpService.send(req.user!.userId, req.body.phone));
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/otp/verify',
  authMiddleware,
  validateBody(otpVerifySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await otpService.verify(req.user!.userId, req.body.phone, req.body.code));
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/email/send',
  authMiddleware,
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await authService.sendEmailVerification(req.user!.userId));
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/email/verify',
  validateBody(emailVerifySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await authService.verifyEmailToken(req.body.token));
    } catch (err) {
      next(err);
    }
  },
);

export const authRouter = router;
