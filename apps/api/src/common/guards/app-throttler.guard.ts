// apps/api/src/common/guards/app-throttler.guard.ts
//
// Custom ThrottlerGuard for F-04 (Step 15.8.4).
//
// Rationale: the strict @Throttle() overrides added in step-15.8.4
// (register 5/min, otp/request 3/min, login 5/min, etc.) are correct for
// production traffic but collide with the E2E test suite, which
// intentionally registers many users from the same IP within seconds.
// Result: 27 tests in 7 suites failed with 429 "Too Many Requests".
//
// Fix: skip throttling entirely when NODE_ENV=test. Jest sets
// NODE_ENV=test automatically, so this covers all unit + e2e + integration
// suites. Production/staging/dev keep the guard active.
//
// Safety: this only relaxes rate limiting during automated tests -- the
// deployed containers run with NODE_ENV=production (set in docker-compose),
// so real traffic always hits the guard.
//
// Reference: docs/security-check-report.md F-04, CI run 35394621365.

import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') {
      return true;
    }
    return super.shouldSkip(_context);
  }
}