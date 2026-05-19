import { Controller, Get, Post, Body, Param, Headers, HttpException, HttpStatus } from '@nestjs/common';
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

@Controller('api/compare')
export class CompareController {
  @Get()
  async list(@Headers() headers: Record<string, string>) {
    const userId = validateAuth(headers);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const tests = await prisma.compareTest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return tests.map(t => ({
      ...t,
      models: typeof t.models === 'string' ? JSON.parse(t.models) : t.models,
      responses: typeof t.responses === 'string' ? JSON.parse(t.responses) : t.responses,
    }));
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Headers() headers: Record<string, string>) {
    const userId = validateAuth(headers);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const test = await prisma.compareTest.findFirst({ where: { userId, id } });
    if (!test) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

    return {
      ...test,
      models: typeof test.models === 'string' ? JSON.parse(test.models) : test.models,
      responses: typeof test.responses === 'string' ? JSON.parse(test.responses) : test.responses,
    };
  }

  @Post()
  async create(@Headers() headers: Record<string, string>, @Body() body: { prompt: string; models: string[] }) {
    const userId = validateAuth(headers);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const test = await prisma.compareTest.create({
      data: {
        userId,
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
}
