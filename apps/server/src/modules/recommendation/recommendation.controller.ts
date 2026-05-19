import { Controller, Get, Post, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('api/recommendations')
export class RecommendationController {
  constructor(private authService: AuthService) {}

  @Get()
  async list(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const recs = await prisma.recommendation.findMany({
      where: { userId: user.userId },
      orderBy: { usageCount: 'desc' },
    });

    return { recommendations: recs };
  }

  @Post('generate')
  async generate(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    // Analyze usage to find top models
    const topModels = await prisma.usageRecord.groupBy({
      by: ['modelId'],
      where: { userId: user.userId },
      _count: { modelId: true },
      _avg: { cost: true },
      _sum: { promptTokens: true, completionTokens: true },
    });

    // Sort by usage count descending
    topModels.sort((a, b) => b._count.modelId - a._count.modelId);

    const taskTypes = ['coding', 'writing', 'analysis', 'summarization', 'translation'];
    for (let i = 0; i < taskTypes.length && i < topModels.length; i++) {
      const best = topModels[i];
      const taskType = taskTypes[i];
      await prisma.recommendation.upsert({
        where: {
          userId_taskType: { userId: user.userId, taskType },
        } as any,
        create: {
          userId: user.userId,
          taskType,
          recommendedModel: best.modelId,
          reason: `Top model by usage — ${best._count.modelId} requests at avg $${(best._avg.cost ?? 0).toFixed(6)}/req`,
          usageCount: best._count.modelId,
        },
        update: {
          recommendedModel: best.modelId,
          usageCount: { increment: 1 },
          updatedAt: new Date(),
        },
      });
    }

    const recs = await prisma.recommendation.findMany({
      where: { userId: user.userId },
      orderBy: { usageCount: 'desc' },
    });

    return { recommendations: recs };
  }
}
