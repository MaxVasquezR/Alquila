import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { authRouter } from './modules/auth/auth.controller';
import { productsRouter } from './modules/products/products.controller';
import { checkoutRouter } from './modules/membership/membership.controller';
import { adsRouter } from './modules/ads/ads.controller';
import { rentalRequestsRouter } from './modules/rental-requests/rental-requests.controller';
import { chatRouter } from './modules/chat/chat.controller';
import { notificationsRouter } from './modules/notifications/notifications.controller';
import { kycRouter } from './modules/kyc/kyc.controller';
import { accountRouter } from './modules/account/account.controller';
import { reportsRouter } from './modules/reports/reports.controller';
import { catalogRouter } from './modules/catalog/catalog.controller';

export function createApp() {
  const app = express();

  app.use(helmet());
  const corsOrigins =
    env.corsOrigin === '*'
      ? true
      : env.corsOrigin.split(',').map((o) => o.trim());

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(path.join(__dirname, '../public')));

  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'alquila-api' });
  });

  const api = express.Router();
  api.use('/auth', authRouter);
  api.use('/products', productsRouter);
  api.use('/checkout', checkoutRouter);
  api.use('/ads', adsRouter);
  api.use('/rental-requests', rentalRequestsRouter);
  api.use('/chat', chatRouter);
  api.use('/notifications', notificationsRouter);
  api.use('/catalog', catalogRouter);
  api.use('/kyc', kycRouter);
  api.use('/account', accountRouter);
  api.use('/reports', reportsRouter);

  app.use('/api/v1', api);
  app.use(errorHandler);

  return app;
}
