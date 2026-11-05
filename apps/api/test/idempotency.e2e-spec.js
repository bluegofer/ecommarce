"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const testing_1 = require("@nestjs/testing");
const supertest_1 = __importDefault(require("supertest"));
const crypto_1 = require("crypto");
const database_module_1 = require("../src/database/database.module");
const prisma_service_1 = require("../src/database/prisma.service");
const idempotency_interceptor_1 = require("../src/common/interceptors/idempotency.interceptor");
const public_decorator_1 = require("../src/common/decorators/public.decorator");
const helpers_1 = require("./helpers");
/**
 * AC-47: same Idempotency-Key -> same response, single effect.
 * Uses an in-test controller so we count handler executions directly.
 */
let executionCount = 0;
let IdempotentDemoController = class IdempotentDemoController {
    charge() {
        executionCount++;
        return { ok: true, chargeId: 'fixed-for-test', executions: executionCount };
    }
};
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('charge'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IdempotentDemoController.prototype, "charge", null);
IdempotentDemoController = __decorate([
    (0, common_1.Controller)('idempotent-demo'),
    (0, common_1.UseInterceptors)(idempotency_interceptor_1.IdempotencyInterceptor)
], IdempotentDemoController);
describe('Idempotency (e2e)', () => {
    let app;
    let prisma;
    beforeAll(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            imports: [database_module_1.DatabaseModule],
            controllers: [IdempotentDemoController],
        }).compile();
        app = moduleRef.createNestApplication();
        app.setGlobalPrefix('api/v1');
        await app.init();
        prisma = app.get(prisma_service_1.PrismaService);
    });
    beforeEach(async () => {
        executionCount = 0;
        await prisma.idempotencyKey.deleteMany();
    });
    afterAll(async () => {
        await (0, helpers_1.cleanDatabase)(prisma);
        await app.close();
    });
    it('returns the stored response on replay without re-executing', async () => {
        const key = (0, crypto_1.randomUUID)();
        const http = (0, supertest_1.default)(app.getHttpServer());
        const first = await http
            .post('/api/v1/idempotent-demo/charge')
            .set('Idempotency-Key', key)
            .expect(201);
        const second = await http
            .post('/api/v1/idempotent-demo/charge')
            .set('Idempotency-Key', key)
            .expect(201);
        expect(second.body).toEqual(first.body);
        expect(executionCount).toBe(1);
    });
    it('rejects reuse of a key with a different payload', async () => {
        const key = (0, crypto_1.randomUUID)();
        const http = (0, supertest_1.default)(app.getHttpServer());
        await http
            .post('/api/v1/idempotent-demo/charge')
            .set('Idempotency-Key', key)
            .send({ amount: 100 })
            .expect(201);
        await http
            .post('/api/v1/idempotent-demo/charge')
            .set('Idempotency-Key', key)
            .send({ amount: 200 })
            .expect(400);
    });
});
//# sourceMappingURL=idempotency.e2e-spec.js.map