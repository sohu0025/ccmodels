import { Controller, Get, Post, Put, Delete, Body, Param, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('api/providers')
export class ProviderController {
  constructor(private authService: AuthService) {}

  @Get()
  async list(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const providers = await prisma.userProvider.findMany({
      where: { userId: user.userId },
      orderBy: { sort: 'asc' },
    });

    return providers.map(p => ({
      ...p,
      models: typeof p.models === 'string' ? JSON.parse(p.models) : p.models,
      isActive: p.isActive === 1,
    }));
  }

  @Get(':id')
  async getById(@Headers('authorization') auth: string, @Param('id') id: string) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const provider = await prisma.userProvider.findFirst({ where: { userId: user.userId, id } });
    if (!provider) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

    return {
      ...provider,
      models: typeof provider.models === 'string' ? JSON.parse(provider.models) : provider.models,
      isActive: provider.isActive === 1,
    };
  }

  @Post()
  async create(@Headers('authorization') auth: string, @Body() body: { name: string; type?: string; apiBase?: string; models?: string[]; sort?: number }) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const provider = await prisma.userProvider.create({
      data: {
        userId: user.userId,
        name: body.name,
        type: body.type ?? 'custom',
        apiBase: body.apiBase ?? '',
        models: JSON.stringify(body.models ?? []),
        sort: body.sort ?? 0,
      },
    });

    return provider;
  }

  @Put(':id')
  async update(@Headers('authorization') auth: string, @Param('id') id: string, @Body() body: { name?: string; type?: string; apiBase?: string; models?: string[]; isActive?: boolean; sort?: number }) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const existing = await prisma.userProvider.findFirst({ where: { userId: user.userId, id } });
    if (!existing) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

    const provider = await prisma.userProvider.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        type: body.type ?? existing.type,
        apiBase: body.apiBase ?? existing.apiBase,
        models: body.models !== undefined ? JSON.stringify(body.models) : existing.models,
        isActive: body.isActive !== undefined ? (body.isActive ? 1 : 0) : existing.isActive,
        sort: body.sort ?? existing.sort,
      },
    });

    return provider;
  }

  @Delete(':id')
  async remove(@Headers('authorization') auth: string, @Param('id') id: string) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const existing = await prisma.userProvider.findFirst({ where: { userId: user.userId, id } });
    if (!existing) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

    await prisma.userProvider.delete({ where: { id } });
    return { success: true };
  }

  @Put(':id/setActive')
  async setActive(@Headers('authorization') auth: string, @Param('id') id: string) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    // Deactivate all
    await prisma.userProvider.updateMany({
      where: { userId: user.userId },
      data: { isActive: 0 },
    });
    // Activate selected
    await prisma.userProvider.update({
      where: { id },
      data: { isActive: 1 },
    });

    return { success: true };
  }
}
