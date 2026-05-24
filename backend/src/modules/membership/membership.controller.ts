import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { checkoutSchema } from './membership.schemas';
import { MembershipService } from './membership.service';

const router = Router();
const membershipService = new MembershipService();

router.post(
  '/membership',
  authMiddleware,
  validateBody(checkoutSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await membershipService.checkout(
        req.user!.userId,
        req.body,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export const checkoutRouter = router;
