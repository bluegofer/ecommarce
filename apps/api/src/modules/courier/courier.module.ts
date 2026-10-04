// apps/api/src/modules/courier/courier.module.ts
// step-165: Steadfast is the active courier (Pathao disabled per client decision).
// Real Steadfast adapter when STEADFAST_API_KEY + STEADFAST_SECRET_KEY set;
// otherwise MockSteadfastAdapter (dev/test).
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CourierService } from './courier.service';
import { CourierController } from './courier.controller';
import { COURIER_ADAPTERS } from './courier-adapter.interface';
import { CourierAdapterRegistryImpl } from './courier-registry';
import { MockSteadfastAdapter } from './adapters/mock-steadfast.adapter';
import { SteadfastAdapter } from './adapters/steadfast.adapter';
import { PrismaService } from '../../database/prisma.service';
import type { CourierAdapter } from '@ecommarce/types';

interface SteadfastCfg {
  baseUrl: string;
  apiKey: string;
  secretKey: string;
}

function buildAdapters(): CourierAdapter[] {
  const list: CourierAdapter[] = [];

  // step-165: Steadfast is the active courier. Pathao disabled.
  const cfg: SteadfastCfg = {
    baseUrl: process.env.STEADFAST_BASE_URL ?? 'https://portal.steadfast.com.bd/api/v1',
    apiKey: process.env.STEADFAST_API_KEY ?? '',
    secretKey: process.env.STEADFAST_SECRET_KEY ?? '',
  };
  if (cfg.apiKey && cfg.secretKey) {
    list.push(new SteadfastAdapter(cfg));
  } else {
    list.push(new MockSteadfastAdapter());
  }
  return list;
}

@Module({
  imports: [ConfigModule],
  controllers: [CourierController],
  providers: [
    PrismaService,
    {
      provide: COURIER_ADAPTERS,
      inject: [ConfigService],
      useFactory: (): CourierAdapterRegistryImpl =>
        new CourierAdapterRegistryImpl(buildAdapters()),
    },
    CourierService,
  ],
  exports: [CourierService],
})
export class CourierModule {}