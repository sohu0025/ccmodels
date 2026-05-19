import { Module } from '@nestjs/common';
import { ProviderController } from './provider.controller';

@Module({
  controllers: [ProviderController],
})
export class ProviderModule {}
