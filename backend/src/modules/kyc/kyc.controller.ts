import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { kycService } from './kyc.service';
import { completeKycSchema } from './kyc.schemas';
import { env } from '../../config/env';

const router = Router();

router.get('/status', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await kycService.getStatus(req.user!.userId));
  } catch (err) {
    next(err);
  }
});

router.post('/session', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await kycService.startSession(req.user!.userId));
  } catch (err) {
    next(err);
  }
});

router.post(
  '/complete',
  authMiddleware,
  validateBody(completeKycSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (env.isProduction) {
        res.status(403).json({
          error: 'KYC completion is provider-driven in production',
          code: 'KYC_PROVIDER_REQUIRED',
        });
        return;
      }
      res.json(await kycService.completeVerification(req.user!.userId, req.body));
    } catch (err) {
      next(err);
    }
  },
);

router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const secret = req.headers['x-kyc-secret'] as string | undefined;
    if (!kycService.verifyWebhookSecret(secret)) {
      res.status(401).json({ error: 'Invalid webhook secret' });
      return;
    }
    res.json(await kycService.handleWebhook(req.body));
  } catch (err) {
    next(err);
  }
});

export const kycRouter = router;
