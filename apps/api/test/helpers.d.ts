import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';
export declare function createTestApp(): Promise<{
    app: INestApplication;
    prisma: PrismaService;
    redis: RedisService;
}>;
export declare function cleanDatabase(prisma: PrismaService, redis?: RedisService): Promise<void>;
/**
 * Generate a valid BD phone in +8801[3-9]XXXXXXXX format.
 * RegisterDto regex: /^\+8801[3-9]\d{8}$/
 *  - "+8801" prefix
 *  - second digit after 1 : 3-9  (operator code)
 *  - then 8 more digits
 */
export declare function randomPhone(): string;
//# sourceMappingURL=helpers.d.ts.map