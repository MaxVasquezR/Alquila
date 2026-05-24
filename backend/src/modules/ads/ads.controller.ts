import { Router, Request, Response, NextFunction } from 'express';
import { AdsService } from './ads.service';

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

export const adsRouter = router;
