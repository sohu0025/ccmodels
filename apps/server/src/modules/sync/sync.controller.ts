import { Controller, Post, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Handles desktop-to-cloud data sync.
 *
 * Each sync item has: tableName, recordId, action (create/update/delete), payload.
 * The payload is a JSON-serialized record that matches the target table schema.
 */
@Controller('api/sync')
export class SyncController {
  constructor(private authService: AuthService) {}

  @Post('push')
  async push(@Headers('authorization') auth: string, @Body() items: any[]) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    let processed = 0;
    for (const item of items) {
      const { tableName, recordId, action, payload } = item;
      try {
        await this.applySyncItem(user.userId, tableName, recordId, action, payload);
        await prisma.syncLog.create({
          data: {
            userId: user.userId,
            tableName,
            recordId,
            action,
          },
        });
        processed++;
      } catch (err: any) {
        // Log but continue processing remaining items
        console.error(`[Sync] Failed to apply ${action} for ${tableName}:${recordId}`, err.message);
      }
    }
    return { success: true, processed };
  }

  @Post('pull')
  async pull(
    @Headers('authorization') auth: string,
    @Body() body: { tableNames?: string[]; lastSyncAt?: string },
  ) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const items: any[] = [];

    // Push cloud data back to desktop for specific table types
    const tables = body.tableNames ?? ['providers'];
    const since = body.lastSyncAt ? new Date(body.lastSyncAt) : undefined;

    for (const tableName of tables) {
      if (tableName === 'providers') {
        const providers = await prisma.userProvider.findMany({
          where: { userId: user.userId, ...(since ? { updatedAt: { gt: since } } : {}) },
        });
        for (const p of providers) {
          items.push({
            tableName: 'providers',
            recordId: p.id,
            action: 'create',
            payload: {
              id: p.id,
              name: p.name,
              type: p.type,
              apiBase: p.apiBase,
              models: p.models,
              isActive: p.isActive === 1,
              sort: p.sort,
              createdAt: p.createdAt.toISOString(),
              updatedAt: p.updatedAt.toISOString(),
            },
          });
        }
      }
    }

    return { success: true, items };
  }

  /**
   * Apply a single sync item to the appropriate MySQL table.
   */
  private async applySyncItem(
    userId: string,
    tableName: string,
    _recordId: string,
    action: string,
    payload: any,
  ): Promise<void> {
    // Strip fields that shouldn't be synced
    const data = { ...payload };

    switch (tableName) {
      case 'usage_records': {
        const recordData = {
          userId,
          providerId: data.providerId ?? '',
          providerName: data.providerName ?? '',
          modelId: data.modelId ?? '',
          promptTokens: data.promptTokens ?? 0,
          completionTokens: data.completionTokens ?? 0,
          cacheHitTokens: data.cacheHitTokens ?? 0,
          cost: data.cost ?? 0,
          cliTool: data.cliTool ?? '',
          sessionId: data.sessionId ?? null,
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        };

        if (action === 'create' || action === 'update') {
          await prisma.usageRecord.upsert({
            where: { id: data.id },
            create: { id: data.id, ...recordData },
            update: recordData,
          });
        } else if (action === 'delete') {
          await prisma.usageRecord.deleteMany({ where: { id: data.id, userId } });
        }
        break;
      }

      case 'sessions': {
        const recordData = {
          userId,
          cliTool: data.cliTool ?? '',
          providerId: data.providerId ?? '',
          providerName: data.providerName ?? '',
          modelId: data.modelId ?? '',
          summary: data.summary ?? '',
          messageCount: data.messageCount ?? 0,
          totalTokens: data.totalTokens ?? 0,
          totalCost: data.totalCost ?? 0,
          startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
          endedAt: data.endedAt ? new Date(data.endedAt) : null,
        };

        if (action === 'create' || action === 'update') {
          await prisma.session.upsert({
            where: { id: data.id },
            create: { id: data.id, ...recordData },
            update: recordData,
          });
        } else if (action === 'delete') {
          await prisma.session.deleteMany({ where: { id: data.id, userId } });
        }
        break;
      }

      case 'session_messages': {
        const recordData = {
          userId,
          sessionId: data.sessionId ?? '',
          role: data.role ?? '',
          content: data.content ?? '',
          tokens: data.tokens ?? 0,
        };

        if (action === 'create' || action === 'update') {
          await prisma.sessionMessage.upsert({
            where: { id: data.id },
            create: { id: data.id, ...recordData },
            update: recordData,
          });
        } else if (action === 'delete') {
          await prisma.sessionMessage.deleteMany({ where: { id: data.id, userId } });
        }
        break;
      }

      case 'speed_tests': {
        const recordData = {
          userId,
          providerId: data.providerId ?? '',
          latencyMs: data.latencyMs ?? 0,
          success: data.success ? 1 : 0,
          testedAt: data.testedAt ? new Date(data.testedAt) : new Date(),
        };

        if (action === 'create') {
          await prisma.speedTest.create({ data: { id: data.id, ...recordData } });
        } else if (action === 'delete') {
          await prisma.speedTest.deleteMany({ where: { id: data.id, userId } });
        }
        break;
      }

      case 'budget_alerts': {
        const recordData = {
          userId,
          month: data.month ?? '',
          limitAmount: data.limitAmount ?? 0,
          totalCost: data.totalCost ?? 0,
          thresholdPct: data.thresholdPct ?? 80,
          usagePct: data.usagePct ?? 0,
          notified: data.notified ? 1 : 0,
        };

        if (action === 'create' || action === 'update') {
          await prisma.budgetAlert.upsert({
            where: { userId_month: { userId, month: recordData.month } },
            create: { id: data.id, ...recordData },
            update: recordData,
          });
        }
        break;
      }

      case 'providers': {
        // Sync provider metadata only — NEVER sync API keys
        const recordData = {
          userId,
          name: data.name ?? '',
          type: data.type ?? 'custom',
          apiBase: data.apiBase ?? '',
          models: data.models ?? '[]',
          isActive: data.isActive ? 1 : 0,
          sort: data.sort ?? 0,
        };

        if (action === 'create' || action === 'update') {
          await prisma.userProvider.upsert({
            where: { id: data.id },
            create: { id: data.id, ...recordData },
            update: recordData,
          });
        } else if (action === 'delete') {
          await prisma.userProvider.deleteMany({ where: { id: data.id, userId } });
        }
        break;
      }

      case 'compare_tests': {
        const recordData = {
          userId,
          prompt: data.prompt ?? '',
          models: data.models ?? '[]',
          responses: data.responses ?? '[]',
          status: data.status ?? 'pending',
        };

        if (action === 'create' || action === 'update') {
          await prisma.compareTest.upsert({
            where: { id: data.id },
            create: { id: data.id, ...recordData },
            update: recordData,
          });
        } else if (action === 'delete') {
          await prisma.compareTest.deleteMany({ where: { id: data.id, userId } });
        }
        break;
      }

      case 'recommendations': {
        const recordData = {
          userId,
          taskType: data.taskType ?? '',
          recommendedModel: data.recommendedModel ?? '',
          reason: data.reason ?? '',
          usageCount: data.usageCount ?? 0,
        };

        if (action === 'create' || action === 'update') {
          await prisma.recommendation.upsert({
            where: { id: data.id },
            create: { id: data.id, ...recordData },
            update: recordData,
          });
        } else if (action === 'delete') {
          await prisma.recommendation.deleteMany({ where: { id: data.id, userId } });
        }
        break;
      }


      default:
        console.warn(`[Sync] Unknown table: ${tableName}`);
        break;
    }
  }
}
