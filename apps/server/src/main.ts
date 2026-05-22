import * as Sentry from '@sentry/node';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { AppModule } from './app.module';

const MIME_TYPES: Record<string, string> = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

async function bootstrap() {
  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
    console.log('[Sentry] initialized');
  }

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  // CORS — origins can be configured via CORS_ORIGINS env var
  const corsOriginsEnv = process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174';
  const corsOrigins = corsOriginsEnv.split(',').map((o) => o.trim());
  app.enableCors({ origin: corsOrigins, credentials: true });

  // Public endpoint: system settings (website URL, version, download link)
  const prisma = new PrismaClient();
  const fastify = app.getHttpAdapter().getInstance();
  fastify.get('/api/system-settings', async (_request: any, reply: any) => {
    try {
      const rows = await prisma.appSetting.findMany({
        where: { key: { in: ['websiteUrl', 'latestVersion', 'downloadUrl'] } },
      });
      const map: Record<string, string> = { websiteUrl: 'https://cc-models.app', latestVersion: '', downloadUrl: '' };
      for (const row of rows) map[row.key] = row.value;
      return reply.send(map);
    } catch (err) {
      console.error('[SystemSettings] Failed to read:', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Serve web SPA static files
  const webDistPath = resolve(__dirname, '../../web/dist');
  if (existsSync(webDistPath)) {
    // SPA catch-all: non-API GET routes → serve index.html or static files
    const rawHtml = readFileSync(resolve(webDistPath, 'index.html'), 'utf-8');
    // Inject <base href="/"> for correct asset resolution under SPA routes
    const indexHtml = rawHtml.replace('<head>', '<head><base href="/">');
    const fastify = app.getHttpAdapter().getInstance();
    fastify.get('*', (request, reply) => {
      const url = request.url.split('?')[0];
      if (url.startsWith('/api/')) {
        return reply.status(404).send({ statusCode: 404, message: 'Not found' });
      }

      // Try serving static files
      const filePath = resolve(webDistPath, url.replace(/^\//, ''));
      if (existsSync(filePath) && statSync(filePath).isFile()) {
        const ext = extname(filePath);
        return reply.type(MIME_TYPES[ext] || 'application/octet-stream').send(readFileSync(filePath));
      }

      // SPA fallback: return index.html only for non-file-looking paths
      const lastSegment = url.split('/').pop() || '';
      if (lastSegment.includes('.')) {
        return reply.status(404).send({ statusCode: 404, message: 'Not found' });
      }
      reply.type('text/html').send(indexHtml);
    });
  }

  const port = parseInt(process.env.PORT || '3000');
  await app.listen(port, '0.0.0.0');
  console.log(`[CC Models Server] Running on http://0.0.0.0:${port}`);
}
bootstrap();
