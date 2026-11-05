"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestApp = createTestApp;
exports.cleanDatabase = cleanDatabase;
exports.randomPhone = randomPhone;
const common_1 = require("@nestjs/common");
const testing_1 = require("@nestjs/testing");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/database/prisma.service");
const redis_service_1 = require("../src/database/redis.service");
async function createTestApp() {
    const moduleRef = await testing_1.Test.createTestingModule({
        imports: [app_module_1.AppModule],
    }).compile();
    const app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use((0, cookie_parser_1.default)());
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    const prisma = app.get(prisma_service_1.PrismaService);
    const redis = app.get(redis_service_1.RedisService);
    return { app, prisma, redis };
}
async function cleanDatabase(prisma, redis) {
    if (redis) {
        try {
            await redis.client.flushdb();
        }
        catch {
            // ignore
        }
    }
    const deletions = [
        ['idempotencyKey', () => prisma.idempotencyKey.deleteMany()],
        ['outbox', () => prisma.outbox.deleteMany()],
        ['auditLog', () => prisma.auditLog.deleteMany()],
        ['refreshToken', () => prisma.refreshToken.deleteMany()],
        ['userRole', () => prisma.userRole.deleteMany()],
        ['totpSecret', () => prisma.totpSecret.deleteMany()],
        ['notificationPreference', () => prisma.notificationPreference.deleteMany()],
        ['user', () => prisma.user.deleteMany()],
        ['rolePermission', () => prisma.rolePermission.deleteMany()],
        ['permission', () => prisma.permission.deleteMany()],
        ['role', () => prisma.role.deleteMany()],
    ];
    for (const [name, fn] of deletions) {
        try {
            await fn();
        }
        catch (err) {
            // eslint-disable-next-line no-console
            console.error(`cleanDatabase failed on ${name}:`, err);
            throw err;
        }
    }
}
/**
 * Generate a valid BD phone in +8801[3-9]XXXXXXXX format.
 * RegisterDto regex: /^\+8801[3-9]\d{8}$/
 *  - "+8801" prefix
 *  - second digit after 1 : 3-9  (operator code)
 *  - then 8 more digits
 */
function randomPhone() {
    const operator = 3 + Math.floor(Math.random() * 7); // 3..9
    const rest = Math.floor(10000000 + Math.random() * 90000000); // 8 digits
    return `+8801${operator}${rest.toString().slice(0, 8)}`;
}
//# sourceMappingURL=helpers.js.map