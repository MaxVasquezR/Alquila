import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authMiddleware } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import {
  createProductSchema,
  createProductExpressSchema,
  updateProductSchema,
  listProductsQuerySchema,
  ListProductsQuery,
} from './products.schemas';
import { ProductsService } from './products.service';
import { env } from '../../config/env';
import { mediaService } from '../../services/media.service';

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

function parseCheckboxValue(value: unknown) {
  if (value === true || value === 'true' || value === 'on' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return undefined;
}

function normalizeProductBody(body: Record<string, unknown>) {
  return {
    ...body,
    availableToday: parseCheckboxValue(body.availableToday),
  };
}

const router = Router();
const productsService = new ProductsService();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: env.maxProductImages,
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

router.get(
  '/',
  validateQuery(listProductsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = (
        req as Request & { validatedQuery: ListProductsQuery }
      ).validatedQuery;
      const result = await productsService.list(query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await productsService.getMyProducts(req.user!.userId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productsService.getByIdPublic(paramId(req));
    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/express',
  authMiddleware,
  upload.array('images', env.maxProductImages),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createProductExpressSchema.safeParse(
        normalizeProductBody(req.body as Record<string, unknown>),
      );
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const uploadedImageUrls =
        files.length > 0 ? await mediaService.uploadProductImages(files) : [];
      const product = await productsService.createExpress(
        req.user!.userId,
        {
          ...parsed.data,
          imageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : parsed.data.imageUrls,
        },
      );
      res.status(201).json(product);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  authMiddleware,
  upload.array('images', env.maxProductImages),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createProductSchema.safeParse(
        normalizeProductBody(req.body as Record<string, unknown>),
      );
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const uploadedImageUrls =
        files.length > 0 ? await mediaService.uploadProductImages(files) : [];
      const product = await productsService.create(
        req.user!.userId,
        {
          ...parsed.data,
          imageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : parsed.data.imageUrls,
        },
      );
      res.status(201).json(product);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id',
  authMiddleware,
  validateBody(updateProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await productsService.update(
        req.user!.userId,
        paramId(req),
        req.body,
      );
      res.json(product);
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await productsService.delete(req.user!.userId, paramId(req)));
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/republish',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await productsService.republish(req.user!.userId, paramId(req));
      res.status(201).json(product);
    } catch (err) {
      next(err);
    }
  },
);

export const productsRouter = router;
