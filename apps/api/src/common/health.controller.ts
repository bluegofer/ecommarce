import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../database/redis.service';
import { Public } from './decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  async check(): Promise<{
    status: string;
    timestamp: string;
    db: string;
    redis: string;
  }> {
    let db = 'ok';
    let redis = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }

    try {
      await this.redis.ping();
    } catch {
      redis = 'down';
    }

    return {
      status: db === 'ok' && redis === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      db,
      redis,
    };
  }
}