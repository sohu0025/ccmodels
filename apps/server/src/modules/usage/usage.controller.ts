import { Controller, Get, Query, Headers, HttpException, HttpStatus } from '@nestjs/common';
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

@Controller('api/usage')
export class UsageController {
  @Get('stats')
  async getStats(@Headers() headers: Record<string, string>) {
    const userId = validateAuth(headers);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const totalRequests = await prisma.usageRecord.count({ where: { userId } });
    const totals = await prisma.usageRecord.aggregate({
      where: { userId },
      _sum: { promptTokens: true, completionTokens: true, cacheHitTokens: true, cost: true },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthCost = await prisma.usageRecord.aggregate({
      where: { userId, timestamp: { gte: monthStart } },
      _sum: { cost: true },
    });

    const activeProviders = await prisma.usageRecord.findMany({
      where: { userId },
      select: { providerId: true },
      distinct: ['providerId'],
    });

    return {
      totalRequests,
      totalTokens: (totals._sum.promptTokens ?? 0) + (totals._sum.completionTokens ?? 0),
      totalCost: totals._sum.cost ?? 0,
      activeProviders: activeProviders.length,
      monthlyCost: monthCost._sum.cost ?? 0,
    };
  }

  @Get('daily')
  async getDaily(@Query('from') from: string, @Query('to') to: string, @Headers() headers: Record<string, string>) {
    const userId = validateAuth(headers);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const where: any = { userId };
    if (from) where.timestamp = { gte: new Date(from) };
    if (to) where.timestamp = { ...where.timestamp, lte: new Date(to) };

    const records = await prisma.usageRecord.findMany({
      where,
      orderBy: { timestamp: 'asc' },
    });

    const dailyMap = new Map<string, { date: string; requests: number; tokens: number; cost: number }>();
    for (const r of records) {
      const date = r.timestamp.toISOString().split('T')[0];
      const entry = dailyMap.get(date) || { date, requests: 0, tokens: 0, cost: 0 };
      entry.requests++;
      entry.tokens += (r.promptTokens ?? 0) + (r.completionTokens ?? 0);
      entry.cost += r.cost;
      dailyMap.set(date, entry);
    }

    return { daily: Array.from(dailyMap.values()) };
  }

  @Get('byProvider')
  async getByProvider(@Query('from') from: string, @Query('to') to: string, @Headers() headers: Record<string, string>) {
    const userId = validateAuth(headers);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const where: any = { userId };
    if (from) where.timestamp = { gte: new Date(from) };
    if (to) where.timestamp = { ...where.timestamp, lte: new Date(to) };

    const providers = await prisma.usageRecord.groupBy({
      by: ['providerId'],
      where,
      _count: { providerId: true },
      _sum: { promptTokens: true, completionTokens: true, cost: true },
    });

    return {
      providers: providers.map(p => ({
        providerId: p.providerId,
        requests: p._count.providerId,
        totalTokens: (p._sum.promptTokens ?? 0) + (p._sum.completionTokens ?? 0),
        totalCost: p._sum.cost ?? 0,
      })),
    };
  }

  @Get('byModel')
  async getByModel(@Query('from') from: string, @Query('to') to: string, @Headers() headers: Record<string, string>) {
    const userId = validateAuth(headers);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const where: any = { userId };
    if (from) where.timestamp = { gte: new Date(from) };
    if (to) where.timestamp = { ...where.timestamp, lte: new Date(to) };

    const models = await prisma.usageRecord.groupBy({
      by: ['modelId'],
      where,
      _count: { modelId: true },
      _sum: { promptTokens: true, completionTokens: true, cost: true },
    });

    return {
      models: models.map(m => ({
        modelId: m.modelId,
        requests: m._count.modelId,
        totalTokens: (m._sum.promptTokens ?? 0) + (m._sum.completionTokens ?? 0),
        totalCost: m._sum.cost ?? 0,
      })),
    };
  }
}
