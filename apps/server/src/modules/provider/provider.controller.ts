import { Controller, Get, Post, Put, Delete, Body, Param, Headers, HttpException, HttpStatus } from '@nestjs/common';
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

@Controller('api/providers')
export class ProviderController {
  @Get()
  async list(@Headers() headers: Record<string, string>) {
    const userId = validateAuth(headers);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const providers = await prisma.userProvider.findMany({
      where: { userId },
      select: { id: true, provider: true, settings: true },
    });

    return providers.map(p => ({
      ...p,
      settings: typeof p.settings === 'string' ? JSON.parse(p.settings) : p.settings,
    }));
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Headers() headers: Record<string, string>) {
    const userId = validateAuth(headers);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const provider = await prisma.userProvider.findFirst({ where: { userId, id } });
    if (!provider) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

    return {
      ...provider,
      settings: typeof provider.settings === 'string' ? JSON.parse(provider.settings) : provider.settings,
    };
  }

  @Post()
  async create(@Headers() headers: Record<string, string>, @Body() body: { provider: string; settings?: Record<string, any> }) {
    const userId = validateAuth(headers);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const provider = await prisma.userProvider.create({
      data: {
        userId,
        provider: body.provider,
        apiKey: '',
        settings: JSON.stringify(body.settings ?? {}),
      },
    });

    return provider;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Headers() headers: Record<string, string>, @Body() body: { provider?: string; settings?: Record<string, any> }) {
    const userId = validateAuth(headers);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const existing = await prisma.userProvider.findFirst({ where: { userId, id } });
    if (!existing) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

    const provider = await prisma.userProvider.update({
      where: { id },
      data: {
        provider: body.provider ?? existing.provider,
        settings: body.settings !== undefined ? JSON.stringify(body.settings) : existing.settings,
      },
    });

    return provider;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Headers() headers: Record<string, string>) {
    const userId = validateAuth(headers);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const existing = await prisma.userProvider.findFirst({ where: { userId, id } });
    if (!existing) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

    await prisma.userProvider.delete({ where: { id } });
    return { success: true };
  }
}
