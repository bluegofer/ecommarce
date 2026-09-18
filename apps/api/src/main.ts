import './instrument';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';

import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';

async function bootstrap() {
  // rawBody: true keeps the raw request body on req.rawBody for webhook
  // signature verification (payment + courier). Needed by /payments/webhook/*.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });

  
  app.useGlobalFilters(new SentryExceptionFilter());
const prefix = process.env.API_GLOBAL_PREFIX ?? 'api/v1';
  app.setGlobalPrefix(prefix);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: [process.env.APP_BASE_URL, process.env.ADMIN_BASE_URL].filter(Boolean) as string[],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ecommarce API')
    .setDescription('Versioned REST API for storefront + admin')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(Number(process.env.API_PORT ?? 4000));
}
void bootstrap();