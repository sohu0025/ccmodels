import { Controller, Post, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('api/sync')
export class SyncController {
  constructor(private authService: AuthService) {}

  @Post('push')
  async push(@Headers('authorization') auth: string, @Body() items: any[]) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    for (const item of items) {
      await prisma.syncLog.create({
        data: {
          userId: user.userId,
          tableName: item.tableName,
          recordId: item.recordId,
          action: item.action,
        },
      });
    }
    return { success: true, processed: items.length };
  }

  @Post('pull')
  async pull(@Headers('authorization') auth: string, @Body() body: { tableName: string; lastSyncAt?: string }) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return { success: true, items: [] }; // Pull logic TBD per table
  }
}
