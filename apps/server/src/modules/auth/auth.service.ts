import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async validateToken(token: string): Promise<{ userId: string } | null> {
    try { return this.jwtService.verify(token) as { userId: string }; }
    catch { return null; }
  }

  signToken(userId: string): string {
    return this.jwtService.sign({ userId });
  }
}
