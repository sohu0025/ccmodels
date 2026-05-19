import { Controller, Get, Param, Headers, HttpException, HttpStatus } from '@nestjs/common';

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

/**
 * Sessions are stored in desktop SQLite, not server DB.
 * This controller returns empty responses — web app shows "no synced sessions".
 * To implement: add Session model to Prisma + sync from desktop.
 */
@Controller('api/sessions')
export class SessionController {
  @Get()
  async list(@Headers() headers: Record<string, string>) {
    const userId = validateAuth(headers);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return { sessions: [], message: 'Sessions are stored locally. Sync from desktop to view here.' };
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Headers() headers: Record<string, string>) {
    const userId = validateAuth(headers);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return { session: null, message: 'Session not synced to cloud.' };
  }
}
