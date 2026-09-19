// PaymentsModule — wires the payment adapter registry with env-driven
// real/mock fallback (TDD §6.8). Real adapter runs when the provider's
// required env keys are present; otherwise MockPaymentAdapter (Step 13.1).
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentAdapterRegistryImpl } from './payment-adapter.registry';
import { PAYMENT_ADAPTERS } from './payment-adapter.interface';
import { MockPaymentAdapter } from './adapters/mock-payment.adapter';
import { BkashAdapter } from './adapters/bkash.adapter';
import { NagadAdapter } from './adapters/nagad.adapter';
import { SslcommerzAdapter } from './adapters/sslcommerz.adapter';
import { CodAdapter } from './adapters/cod.adapter';
import { PrismaService } from '../../database/prisma.service';
import type { PaymentAdapter } from '@ecommarce/types';

function buildAdapters(config: AppConfig): PaymentAdapter[] {
  const list: PaymentAdapter[] = [];

  // bKash
  if (config.bkashBaseUrl && config.bkashAppKey && config.bkashAppSecret) {
    list.push(new BkashAdapter(config));
  } else {
    list.push(new MockPaymentAdapter('BKASH'));
  }

  // Nagad
  if (config.nagadBaseUrl && config.nagadMerchantId && config.nagadMerchantPrivateKey) {
    list.push(new NagadAdapter(config));
  } else {
    list.push(new MockPaymentAdapter('NAGAD'));
  }

  // SSLCommerz
  if (config.sslcommerzBaseUrl && config.sslcommerzStoreId && config.sslcommerzStorePassword) {
    list.push(new SslcommerzAdapter(config));
  } else {
    list.push(new MockPaymentAdapter('SSLCOMMERZ'));
  }

  // COD always real (no external call)
  list.push(new CodAdapter(config));

  return list;
}

@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    {
      provide: PAYMENT_ADAPTERS,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService): PaymentAdapterRegistryImpl => {
        const appConfig = cfg.get<AppConfig>('default') ?? ({} as AppConfig);
        // Fallback: if ConfigService does not expose the typed config,
        // read env directly so the module boots without surprises.
        const effective: AppConfig = {
          ...appConfig,
          bkashBaseUrl: appConfig.bkashBaseUrl ?? process.env.BKASH_BASE_URL ?? '',
          bkashAppKey: appConfig.bkashAppKey ?? process.env.BKASH_APP_KEY ?? '',
          bkashAppSecret: appConfig.bkashAppSecret ?? process.env.BKASH_APP_SECRET ?? '',
          bkashUsername: appConfig.bkashUsername ?? process.env.BKASH_USERNAME ?? '',
          bkashPassword: appConfig.bkashPassword ?? process.env.BKASH_PASSWORD ?? '',
          nagadBaseUrl: appConfig.nagadBaseUrl ?? process.env.NAGAD_BASE_URL ?? '',
          nagadMerchantId: appConfig.nagadMerchantId ?? process.env.NAGAD_MERCHANT_ID ?? '',
          nagadMerchantPrivateKey:
            appConfig.nagadMerchantPrivateKey ??
            process.env.NAGAD_MERCHANT_PRIVATE_KEY ??
            '',
          sslcommerzBaseUrl:
            appConfig.sslcommerzBaseUrl ?? process.env.SSLCOMMERZ_BASE_URL ?? '',
          sslcommerzStoreId:
            appConfig.sslcommerzStoreId ?? process.env.SSLCOMMERZ_STORE_ID ?? '',
          sslcommerzStorePassword:
            appConfig.sslcommerzStorePassword ?? process.env.SSLCOMMERZ_STORE_PASSWORD ?? '',
          codMaxOrderValuePoisha:
            appConfig.codMaxOrderValuePoisha ?? Number(process.env.COD_MAX_ORDER_VALUE ?? 0),
          codHandlingFeePoisha:
            appConfig.codHandlingFeePoisha ?? Number(process.env.COD_HANDLING_FEE ?? 0),
        };
        return new PaymentAdapterRegistryImpl(buildAdapters(effective));
      },
    },
    PaymentsService,
  ],
  exports: [PaymentsService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}