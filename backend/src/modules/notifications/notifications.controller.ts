import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { notificationService } from '../../services/notification.service';

const router = Router();

router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await notificationService.list(req.user!.userId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/unread-count',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await notificationService.unreadCount(req.user!.userId);
      res.json({ count });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id/read',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const n = await notificationService.markRead(req.user!.userId, id);
      res.json(n ?? { ok: true });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/read-all',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await notificationService.markAllRead(req.user!.userId);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export const notificationsRouter = router;
