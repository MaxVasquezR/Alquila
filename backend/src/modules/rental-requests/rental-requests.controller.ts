import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { createRentalRequestSchema } from './rental-requests.schemas';
import { RentalRequestsService } from './rental-requests.service';

const router = Router();
const service = new RentalRequestsService();

router.post(
  '/',
  authMiddleware,
  validateBody(createRentalRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = await service.create(req.user!.userId, req.body);
      res.status(201).json(request);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const district = req.query.district as string | undefined;
    const data = await service.listOpen(district);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export const rentalRequestsRouter = router;
