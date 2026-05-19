import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SyncController } from './sync.controller';

@Module({ imports: [AuthModule], controllers: [SyncController] })
export class SyncModule {}
