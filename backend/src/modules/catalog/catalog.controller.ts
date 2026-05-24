import { Router } from 'express';
import { MARKET_CATEGORIES } from '../../data/market-categories';

const router = Router();

router.get('/categories', (_req, res) => {
  res.json({ data: MARKET_CATEGORIES });
});

export const catalogRouter = router;
