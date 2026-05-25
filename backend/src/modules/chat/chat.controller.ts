import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import {
  createThreadSchema,
  sendMessageSchema,
  updateDealStatusSchema,
  ownerConfirmDealSchema,
  repeatContactSchema,
  submitCheckpointSchema,
} from './chat.schemas';
import { ChatService } from './chat.service';
import { env } from '../../config/env';

const router = Router();
const chatService = new ChatService();
const checkpointUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 4,
    fileSize: env.maxProductImageBytes,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('Solo se permiten imágenes jpg, png o webp'));
      return;
    }
    cb(null, true);
  },
});

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many messages, slow down' },
});

router.get('/repeat-clients', authMiddleware, async (req, res, next) => {
  try {
    const data = await chatService.listRepeatClients(req.user!.userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/repeat-contact',
  authMiddleware,
  validateBody(repeatContactSchema),
  async (req, res, next) => {
    try {
      const result = await chatService.repeatContact(
        req.user!.userId,
        req.body.tenantId,
        req.body.productId,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/threads', authMiddleware, async (req, res, next) => {
  try {
    const data = await chatService.listThreads(req.user!.userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.get('/threads/:id', authMiddleware, async (req, res, next) => {
  try {
    const thread = await chatService.getThread(req.user!.userId, paramId(req));
    res.json(thread);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/threads',
  authMiddleware,
  validateBody(createThreadSchema),
  async (req, res, next) => {
    try {
      const result = await chatService.createThread(
        req.user!.userId,
        req.body.productId,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/threads/:id/messages', authMiddleware, async (req, res, next) => {
  try {
    const messages = await chatService.getMessages(
      req.user!.userId,
      paramId(req),
    );
    res.json({ data: messages });
  } catch (err) {
    next(err);
  }
});

router.get('/threads/:id/checkpoints', authMiddleware, async (req, res, next) => {
  try {
    const data = await chatService.getCheckpoints(req.user!.userId, paramId(req));
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/threads/:id/messages',
  authMiddleware,
  chatLimiter,
  validateBody(sendMessageSchema),
  async (req, res, next) => {
    try {
      const message = await chatService.sendMessage(
        req.user!.userId,
        paramId(req),
        req.body,
      );
      res.status(201).json(message);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/threads/:id/confirm-deal',
  authMiddleware,
  validateBody(ownerConfirmDealSchema),
  async (req, res, next) => {
    try {
      const thread = await chatService.ownerConfirmDeal(
        req.user!.userId,
        paramId(req),
        req.body.agreedPrice,
      );
      res.json(thread);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/threads/:id/deal-status',
  authMiddleware,
  validateBody(updateDealStatusSchema),
  async (req, res, next) => {
    try {
      const thread = await chatService.updateDealStatus(
        req.user!.userId,
        paramId(req),
        req.body,
      );
      res.json(thread);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/threads/:id/checkpoints',
  authMiddleware,
  checkpointUpload.array('images', 4),
  async (req, res, next) => {
    try {
      const parsed = submitCheckpointSchema.parse(req.body);
      const result = await chatService.submitCheckpoint(
        req.user!.userId,
        paramId(req),
        parsed,
        (req.files as Express.Multer.File[] | undefined) ?? [],
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.patch('/threads/:id/accept-contact', authMiddleware, async (req, res, next) => {
  try {
    const thread = await chatService.acceptContact(
      req.user!.userId,
      paramId(req),
    );
    res.json(thread);
  } catch (err) {
    next(err);
  }
});

router.get('/threads/:id/reveal-location', authMiddleware, async (req, res, next) => {
  try {
    const location = await chatService.revealLocation(
      req.user!.userId,
      paramId(req),
    );
    res.json(location);
  } catch (err) {
    next(err);
  }
});

export const chatRouter = router;
