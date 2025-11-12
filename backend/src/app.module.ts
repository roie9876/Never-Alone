/**
 * Main NestJS Application Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AzureConfigService } from './config/azure.config';
import { MemoryService } from './services/memory.service';
import { RealtimeService } from './services/realtime.service';
import { ReminderService } from './services/reminder.service';
import { PhotoService } from './services/photo.service';
import { SafetyConfigService } from './services/safety-config.service';
import { MusicService } from './services/music.service';
import { MemoryController } from './controllers/memory.controller';
import { RealtimeController } from './controllers/realtime.controller';
import { ReminderController } from './controllers/reminder.controller';
import { PhotoController } from './controllers/photo.controller';
import { MusicController } from './controllers/music.controller';
import { HealthController } from './controllers/health.controller';
import { RealtimeGateway } from './gateways/realtime.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule available throughout the app
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(), // For cron-based reminders
  ],
  controllers: [
    HealthController,
    MemoryController,
    RealtimeController,
    ReminderController,
    PhotoController,
    MusicController,
  ],
  providers: [
    AzureConfigService,
    MemoryService,
    RealtimeService,
    ReminderService,
    PhotoService,
    SafetyConfigService,
    MusicService,
    RealtimeGateway,
  ],
})
export class AppModule {}
