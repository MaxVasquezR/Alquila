import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { trustService } from '../../services/trust.service';
import { z } from 'zod';

const router = Router();

const reportSchema = z.object({
  reportedId: z.string().uuid(),
  threadId: z.string().uuid().optional(),
  reason: z.string().min(3).max(100),
  details: z.string().max(500).optional(),
});

const blockSchema = z.object({
  blockedId: z.string().uuid(),
});

router.post(
  '/',
  authMiddleware,
  validateBody(reportSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(
        await trustService.reportUser(
          req.user!.userId,
          req.body.reportedId,
          req.body.reason,
          req.body.threadId,
          req.body.details,
        ),
      );
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/block',
  authMiddleware,
  validateBody(blockSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await trustService.blockUser(req.user!.userId, req.body.blockedId));
    } catch (err) {
      next(err);
    }
  },
);

export const reportsRouter = router;
