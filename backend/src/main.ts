/**
 * NestJS Application Entry Point
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:5173'], // React/Vite dev server
    credentials: true,
  });

  // Enable validation
  app.useGlobalPipes(new ValidationPipe());

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log('\n🚀 Never Alone Backend');
  console.log('======================');
  console.log(`✅ Server running on: http://localhost:${port}`);
  console.log(`✅ Health check: http://localhost:${port}/health`);
  console.log(`✅ Memory API: http://localhost:${port}/memory`);
  console.log('\n💡 Press Ctrl+C to stop\n');
}

bootstrap();
