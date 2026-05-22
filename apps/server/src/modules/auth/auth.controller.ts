import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string; name?: string }) {
    if (!body.email || !body.password) {
      throw new HttpException('Email and password are required', HttpStatus.BAD_REQUEST);
    }
    if (body.password.length < 6) {
      throw new HttpException('Password must be at least 6 characters', HttpStatus.BAD_REQUEST);
    }

    const user = await this.authService.register(body.email, body.password, body.name ?? '');
    if (!user) throw new HttpException('Email already exists', HttpStatus.CONFLICT);

    const token = this.authService.signToken(user.id, user.role);

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    if (!body.email || !body.password) {
      throw new HttpException('Email and password are required', HttpStatus.BAD_REQUEST);
    }

    const user = await this.authService.login(body.email, body.password);
    if (!user) {
      throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
    }

    const token = this.authService.signToken(user.id, user.role);

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  /** Legacy endpoint for backward compatibility */
  @Post('token')
  async getToken(@Body() body: { userId: string }) {
    const token = this.authService.signToken(body.userId);
    return { token };
  }
}
