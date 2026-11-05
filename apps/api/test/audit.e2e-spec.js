"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const helpers_1 = require("./helpers");
/**
 * AC-46: a mutating request writes an audit_log row.
 */
describe('Audit trail (e2e)', () => {
    let app;
    let prisma;
    let redis;
    beforeAll(async () => {
        const ctx = await (0, helpers_1.createTestApp)();
        app = ctx.app;
        prisma = ctx.prisma;
        redis = ctx.redis;
    });
    beforeEach(async () => {
        await (0, helpers_1.cleanDatabase)(prisma, redis);
    });
    afterAll(async () => {
        await (0, helpers_1.cleanDatabase)(prisma, redis);
        await app.close();
    });
    it('writes an audit_log row after POST /auth/register', async () => {
        const phone = (0, helpers_1.randomPhone)();
        const http = (0, supertest_1.default)(app.getHttpServer());
        const before = await prisma.auditLog.count();
        const reg = await http
            .post('/api/v1/auth/register')
            .send({ phone, fullName: 'Audit Test', password: 'TestPass123!' });
        expect(reg.status).toBe(201);
        // Audit is async; poll briefly
        let after = before;
        for (let i = 0; i < 20; i++) {
            after = await prisma.auditLog.count();
            if (after > before)
                break;
            await new Promise((r) => setTimeout(r, 100));
        }
        expect(after).toBeGreaterThan(before);
        const row = await prisma.auditLog.findFirst({
            where: { action: { contains: '/auth/register' } },
            orderBy: { createdAt: 'desc' },
        });
        expect(row).not.toBeNull();
        expect(row?.entityType).toBe('auth');
    }, 30000);
});
//# sourceMappingURL=audit.e2e-spec.js.map