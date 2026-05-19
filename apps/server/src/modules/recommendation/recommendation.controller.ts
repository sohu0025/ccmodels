import { Controller, Get, Post, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function validateAuth(headers: { authorization?: string }): string | null {
  const token = headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = Buffer.from(token.split('.')[1], 'base64').toString();
    const payload = JSON.parse(decoded);
    return payload.userId as string;
  } catch {
    return null;
  }
}

@Controller('api/recommendations')
export class RecommendationController {
  @Get()
  async list(@Headers() headers: Record<string, string>) {
    const userId = validateAuth(headers);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const recs = await prisma.recommendation.findMany({
      where: { userId },
      orderBy: { usageCount: 'desc' },
    });

    return { recommendations: recs };
  }

  @Post('generate')
  async generate(@Headers() headers: Record<string, string>) {
    const userId = validateAuth(headers);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    // Analyze usage to find top models
    const topModels = await prisma.usageRecord.groupBy({
      by: ['modelId'],
      where: { userId },
      _count: { modelId: true },
      _avg: { cost: true },
      orderBy: { _count: { modelId: 'desc' } },
      take: 5,
    });

    const taskTypes = ['coding', 'writing', 'analysis', 'summarization', 'translation'];
    for (const taskType of taskTypes) {
      const best = topModels.find(m => (m._avg.cost ?? 0) < 0.01) || topModels[0];
      if (best) {
        await prisma.recommendation.upsert({
          where: {
            userId_taskType: { userId, taskType },
          } as any,
          create: {
            userId,
            taskType,
            recommendedModel: best.modelId,
            reason: `Most used model with avg cost $${(best._avg.cost ?? 0).toFixed(6)}/request`,
            usageCount: best._count.modelId,
          },
          update: {
            usageCount: { increment: 1 },
            updatedAt: new Date(),
          },
        });
      }
    }

    const recs = await prisma.recommendation.findMany({
      where: { userId },
      orderBy: { usageCount: 'desc' },
    });

    return { recommendations: recs };
  }
}
