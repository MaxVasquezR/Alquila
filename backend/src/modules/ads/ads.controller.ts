import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { AdsService } from './ads.service';
import { adCheckoutSchema } from './ads.schemas';

const router = Router();
const adsService = new AdsService();

router.get('/featured', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adsService.getFeatured();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/checkout',
  authMiddleware,
  validateBody(adCheckoutSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await adsService.createCheckout(req.user!.userId, req.body));
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/checkout/:paymentId/confirm',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paymentId = z.string().uuid().parse(
        Array.isArray(req.params.paymentId) ? req.params.paymentId[0] : req.params.paymentId,
      );
      res.json(await adsService.confirmCheckout(req.user!.userId, paymentId));
    } catch (err) {
      next(err);
    }
  },
);

export const adsRouter = router;
