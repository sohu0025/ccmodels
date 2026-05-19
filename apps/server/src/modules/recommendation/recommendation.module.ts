import { Module } from '@nestjs/common';
import { RecommendationController } from './recommendation.controller';

@Module({
  controllers: [RecommendationController],
})
export class RecommendationModule {}
