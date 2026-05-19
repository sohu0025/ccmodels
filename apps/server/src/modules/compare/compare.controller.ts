import { Controller, Get, Post, Body, Param, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('api/compare')
export class CompareController {
  constructor(private authService: AuthService) {}

  @Get()
  async list(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const tests = await prisma.compareTest.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    });

    return tests.map(t => ({
      ...t,
      models: typeof t.models === 'string' ? JSON.parse(t.models) : t.models,
      responses: typeof t.responses === 'string' ? JSON.parse(t.responses) : t.responses,
    }));
  }

  @Get(':id')
  async getById(@Headers('authorization') auth: string, @Param('id') id: string) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const test = await prisma.compareTest.findFirst({ where: { userId: user.userId, id } });
    if (!test) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

    return {
      ...test,
      models: typeof test.models === 'string' ? JSON.parse(test.models) : test.models,
      responses: typeof test.responses === 'string' ? JSON.parse(test.responses) : test.responses,
    };
  }

  @Post()
  async create(@Headers('authorization') auth: string, @Body() body: { prompt: string; models: string[] }) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const test = await prisma.compareTest.create({
      data: {
        userId: user.userId,
        prompt: body.prompt,
        models: JSON.stringify(body.models),
      },
    });

    return {
      ...test,
      models: typeof test.models === 'string' ? JSON.parse(test.models) : test.models,
      responses: typeof test.responses === 'string' ? JSON.parse(test.responses) : test.responses,
    };
  }

  @Post(':id/responses')
  async updateResponse(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() body: { modelId: string; content?: string; error?: string; latencyMs?: number; tokens?: number; cost?: number },
  ) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const test = await prisma.compareTest.findFirst({ where: { userId: user.userId, id } });
    if (!test) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

    const responses = typeof test.responses === 'string' ? JSON.parse(test.responses) : test.responses;
    const existing = responses.findIndex((r: any) => r.modelId === body.modelId);
    const response = {
      modelId: body.modelId,
      content: body.content ?? '',
      error: body.error ?? null,
      latencyMs: body.latencyMs ?? 0,
      tokens: body.tokens ?? 0,
      cost: body.cost ?? 0,
    };

    if (existing >= 0) {
      responses[existing] = response;
    } else {
      responses.push(response);
    }

    const status = responses.length >= (typeof test.models === 'string' ? JSON.parse(test.models) : test.models).length
      ? 'completed'
      : 'running';

    const updated = await prisma.compareTest.update({
      where: { id },
      data: { responses: JSON.stringify(responses), status },
    });

    return {
      ...updated,
      models: typeof updated.models === 'string' ? JSON.parse(updated.models) : updated.models,
      responses: typeof updated.responses === 'string' ? JSON.parse(updated.responses) : updated.responses,
    };
  }
}
