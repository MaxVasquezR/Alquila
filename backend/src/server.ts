import 'reflect-metadata';
import http from 'http';
import { AppDataSource } from './config/data-source';
import { env } from './config/env';
import { createApp } from './app';
import { initSocketIO } from './services/socket.service';
import { seedDemoIfEmpty } from './services/demo-seed.service';

async function bootstrap() {
  await AppDataSource.initialize();
  console.log('Database connected');
  await seedDemoIfEmpty();

  const app = createApp();
  const server = http.createServer(app);
  initSocketIO(server);

  server.listen(env.port, () => {
    console.log(`Alquila API running on http://localhost:${env.port}`);
    console.log(`WebSocket enabled`);
  });
}

bootstrap().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Failed to start server:', message);
  process.exit(1);
});
