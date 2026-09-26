import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';

/**
 * DatabaseModule - global providers for Prisma + Redis.
 * ConfigModule is imported so ConfigService is injectable in tests.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [PrismaService, RedisService],
  exports: [PrismaService, RedisService],
})
export class DatabaseModule {}