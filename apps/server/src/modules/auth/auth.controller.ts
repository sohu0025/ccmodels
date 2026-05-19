import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('token')
  async getToken(@Body() body: { userId: string }) {
    const token = this.authService.signToken(body.userId);
    return { token };
  }
}
