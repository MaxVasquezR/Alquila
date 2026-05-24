import { Router, Request, Response, NextFunction } from 'express';
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

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

const router = Router();
const productsService = new ProductsService();

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
  validateBody(createProductExpressSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await productsService.createExpress(
        req.user!.userId,
        req.body,
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
  validateBody(createProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await productsService.create(
        req.user!.userId,
        req.body,
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

export const productsRouter = router;
