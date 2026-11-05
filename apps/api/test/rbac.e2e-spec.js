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
const app_module_1 = require("../src/app.module");
const roles_decorator_1 = require("../src/common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../src/common/guards/jwt-auth.guard");
const roles_guard_1 = require("../src/common/guards/roles.guard");
/**
 * AC-45: RBAC denies wrong role on an admin-only endpoint.
 * We register a sample controller in the test module and assert 401 vs 403.
 */
let SampleAdminController = class SampleAdminController {
    catalogOnly() {
        return { ok: true, scope: 'catalog' };
    }
};
__decorate([
    (0, common_1.Get)('catalog-only'),
    (0, roles_decorator_1.Roles)('CATALOG_MANAGER'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SampleAdminController.prototype, "catalogOnly", null);
SampleAdminController = __decorate([
    (0, common_1.Controller)('sample-admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)
], SampleAdminController);
describe('RBAC (e2e)', () => {
    let app;
    beforeAll(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
            controllers: [SampleAdminController],
        }).compile();
        app = moduleRef.createNestApplication();
        app.setGlobalPrefix('api/v1');
        await app.init();
    });
    afterAll(async () => {
        await app.close();
    });
    it('returns 401 without a token', async () => {
        await (0, supertest_1.default)(app.getHttpServer())
            .get('/api/v1/sample-admin/catalog-only')
            .expect(401);
    });
    it('returns 401 for an invalid token', async () => {
        await (0, supertest_1.default)(app.getHttpServer())
            .get('/api/v1/sample-admin/catalog-only')
            .set('Authorization', 'Bearer invalid-token')
            .expect(401);
    });
});
//# sourceMappingURL=rbac.e2e-spec.js.map