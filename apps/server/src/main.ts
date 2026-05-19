import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  // CORS
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(',');
  app.enableCors({ origin: corsOrigins.map((o) => o.trim()), credentials: true });

  const port = parseInt(process.env.PORT || '3000');
  await app.listen(port, '0.0.0.0');
  console.log(`[CC Switch Server] Running on http://0.0.0.0:${port}`);
}
bootstrap();
