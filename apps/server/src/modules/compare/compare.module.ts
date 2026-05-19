import { Module } from '@nestjs/common';
import { CompareController } from './compare.controller';

@Module({
  controllers: [CompareController],
})
export class CompareModule {}
