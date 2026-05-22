import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './modules/auth/auth.module';
import { SyncModule } from './modules/sync/sync.module';
import { UsageModule } from './modules/usage/usage.module';
import { SessionModule } from './modules/session/session.module';
import { ProviderModule } from './modules/provider/provider.module';
import { CompareModule } from './modules/compare/compare.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'cc-models-secret', signOptions: { expiresIn: '7d' } }),
    AuthModule,
    SyncModule,
    UsageModule,
    SessionModule,
    ProviderModule,
    CompareModule,
    RecommendationModule,
    AdminModule,
  ],
})
export class AppModule {}
