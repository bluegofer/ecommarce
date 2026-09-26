// CourierModule — env-driven factory: real Pathao when creds present,
// otherwise MockPathaoAdapter (Step 13.1). Steadfast / RedX stubs deferred.
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CourierService } from './courier.service';
import { CourierController } from './courier.controller';
import { COURIER_ADAPTERS } from './courier-adapter.interface';
import { CourierAdapterRegistryImpl } from './courier-registry';
import { MockPathaoAdapter } from './adapters/mock-pathao.adapter';
import { PathaoAdapter } from './adapters/pathao.adapter';
import { PrismaService } from '../../database/prisma.service';
import type { CourierAdapter } from '@ecommarce/types';

interface PathaoCfg {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

function buildAdapters(): CourierAdapter[] {
  const list: CourierAdapter[] = [];
  const cfg: PathaoCfg = {
    baseUrl: process.env.PATHAO_BASE_URL ?? '',
    clientId: process.env.PATHAO_CLIENT_ID ?? '',
    clientSecret: process.env.PATHAO_CLIENT_SECRET ?? '',
  };
  if (cfg.baseUrl && cfg.clientId && cfg.clientSecret) {
    list.push(new PathaoAdapter(cfg));
  } else {
    list.push(new MockPathaoAdapter());
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