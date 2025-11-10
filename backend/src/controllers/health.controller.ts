/**
 * Health Check Controller
 * Provides health status for all Azure services
 */

import { Controller, Get } from '@nestjs/common';
import { AzureConfigService } from '@config/azure.config';

@Controller('health')
export class HealthController {
  constructor(private azureConfig: AzureConfigService) {}

  @Get()
  async checkHealth() {
    const health = await this.azureConfig.healthCheck();

    const allHealthy = Object.values(health).every((status) => status === true);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: health,
      version: '0.1.0',
    };
  }

  @Get('ping')
  ping() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
