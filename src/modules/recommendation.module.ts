import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Recommendation } from '../entities/recommendation.entity';
import { RecommendationController } from '../controllers/recommendation.controller';
import { RecommendationRepository } from '../repositories/recommendation.repository';
import { RecommendationCleanupService } from '../services/recommendation-cleanup.service';
import { DataSyncModule } from './data-sync.module';

/**
 * Module cho recommendation cache system
 * Bao gồm:
 * - Entity và Repository cho cache
 * - Cleanup service với cron jobs  
 * - Admin controller cho monitoring
 * - Schedule module để chạy background jobs
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Recommendation]),
    DataSyncModule,
    ScheduleModule.forRoot(), // Enable cron jobs
  ],
  controllers: [RecommendationController],
  providers: [
    RecommendationRepository,
    RecommendationCleanupService,
  ],
  exports: [
    RecommendationRepository,
    RecommendationCleanupService,
  ],
})
export class RecommendationModule {}
