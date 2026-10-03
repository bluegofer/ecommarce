/**
 * Global exception filter that reports unhandled errors to Sentry.
 *
 * NestJS exception filters catch errors escaping from controllers.
 * The default HttpExceptionFilter converts them to HTTP responses;
 * this filter adds Sentry capture on top.
 *
 * Step 15.11.8 — DECISIONS.md compliance.
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Request, Response } from 'express';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Capture only server errors (5xx) in Sentry — 4xx are usually client mistakes
    if (status >= 500) {
      Sentry.withScope((scope) => {
        scope.setContext('request', {
          method: request.method,
          url: request.originalUrl || request.url,
        });
        scope.setTag('http.status_code', String(status));
        Sentry.captureException(exception);
      });
    }

    // Log server errors for CloudWatch
    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.originalUrl || request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: 'Internal server error' };

    if (!response.headersSent) {
      response.status(status).json(
        typeof message === 'string'
          ? { statusCode: status, message }
          : message,
      );
    }
  }
}