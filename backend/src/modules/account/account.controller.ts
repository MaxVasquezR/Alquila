import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { accountService } from './account.service';
import { listingCheckoutService } from './account.service';
import { z } from 'zod';

const router = Router();

router.get('/summary', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await accountService.summary(req.user!.userId));
  } catch (err) {
    next(err);
  }
});

router.get('/payments', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await accountService.payments(req.user!.userId));
  } catch (err) {
    next(err);
  }
});

router.get('/deals', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ data: await accountService.deals(req.user!.userId) });
  } catch (err) {
    next(err);
  }
});

router.get('/products', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ data: await accountService.products(req.user!.userId) });
  } catch (err) {
    next(err);
  }
});

const listingCheckoutSchema = z.object({
  productId: z.string().uuid(),
});

router.post(
  '/listing',
  authMiddleware,
  validateBody(listingCheckoutSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(
        await listingCheckoutService.createListingPayment(
          req.user!.userId,
          req.body.productId,
        ),
      );
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/listing/:paymentId/confirm',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paymentId = Array.isArray(req.params.paymentId)
        ? req.params.paymentId[0]
        : req.params.paymentId;
      res.json(
        await listingCheckoutService.confirmPayment(req.user!.userId, paymentId),
      );
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/listing/:paymentId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paymentId = Array.isArray(req.params.paymentId)
        ? req.params.paymentId[0]
        : req.params.paymentId;
      res.json(
        await listingCheckoutService.getPaymentStatus(req.user!.userId, paymentId),
      );
    } catch (err) {
      next(err);
    }
  },
);

export const accountRouter = router;
