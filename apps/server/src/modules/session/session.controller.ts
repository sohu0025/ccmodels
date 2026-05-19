import { Controller, Get, Param, Query, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('api/sessions')
export class SessionController {
  constructor(private authService: AuthService) {}

  @Get()
  async list(
    @Headers('authorization') auth: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('search') search?: string,
  ) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const pageNum = parseInt(page) || 1;
    const pageSizeNum = parseInt(pageSize) || 20;

    const where: any = { userId: user.userId };
    if (search) {
      where.OR = [
        { summary: { contains: search } },
        { modelId: { contains: search } },
        { providerName: { contains: search } },
      ];
    }

    const [total, sessions] = await Promise.all([
      prisma.session.count({ where }),
      prisma.session.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
      }),
    ]);

    return { sessions, total };
  }

  @Get(':id')
  async getById(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const session = await prisma.session.findFirst({
      where: { id, userId: user.userId },
    });
    if (!session) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

    const messages = await prisma.sessionMessage.findMany({
      where: { sessionId: id, userId: user.userId },
      orderBy: { createdAt: 'asc' },
    });

    return { session, messages };
  }
}
