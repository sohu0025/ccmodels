import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './modules/auth/auth.module';
import { SyncModule } from './modules/sync/sync.module';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'cc-switch-secret', signOptions: { expiresIn: '7d' } }),
    AuthModule,
    SyncModule,
  ],
})
export class AppModule {}
