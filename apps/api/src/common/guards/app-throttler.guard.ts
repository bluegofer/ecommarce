// apps/api/src/common/guards/app-throttler.guard.ts
//
// Custom ThrottlerGuard for F-04 (Step 15.8.4) + load-test exemption (Step 15.10).
//
// Skips throttling when:
//   1. NODE_ENV === 'test'           (jest suites)
//   2. Client IP matches LOAD_TEST_IP env var (Step 15.10 load tests)
//
// Production/staging keep the guard active for real traffic.
//
// Set LOAD_TEST_IP in staging .env only during load tests; remove afterward.
// Reference: docs/security-check-report.md F-04, docs/load-test-report.md

import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') {
      return true;
    }
    const allowedIp = process.env.LOAD_TEST_IP;
    if (allowedIp) {
      const req = context.switchToHttp().getRequest();
      const clientIp = req.ip || req.socket?.remoteAddress;
      if (clientIp === allowedIp) {
        return true;
      }
    }
    return super.shouldSkip(context);
  }
}