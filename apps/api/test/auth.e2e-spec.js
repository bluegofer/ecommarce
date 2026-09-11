"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const helpers_1 = require("./helpers");
describe('Auth flow (e2e)', () => {
    let app;
    let prisma;
    let redis;
    beforeAll(async () => {
        const ctx = await (0, helpers_1.createTestApp)();
        app = ctx.app;
        prisma = ctx.prisma;
        redis = ctx.redis;
    });
    afterAll(async () => {
        await (0, helpers_1.cleanDatabase)(prisma, redis);
        await app.close();
    });
    it('completes register -> OTP -> login -> refresh -> logout', async () => {
        await (0, helpers_1.cleanDatabase)(prisma, redis);
        const phone = (0, helpers_1.randomPhone)();
        const password = 'TestPass123!';
        const http = (0, supertest_1.default)(app.getHttpServer());
        console.log('=== Registering phone:', phone);
        const reg = await http
            .post('/api/v1/auth/register')
            .send({ phone, fullName: 'Test User', password });
        console.log('=== Register response:', reg.status, JSON.stringify(reg.body));
        // If register fails, throw with the actual error body
        if (reg.status !== 201) {
            throw new Error(`Register failed with ${reg.status}: ${JSON.stringify(reg.body)}`);
        }
        expect(reg.body.devCode).toMatch(/^\d{6}$/);
        const otpVerify = await http
            .post('/api/v1/auth/otp/verify')
            .send({ phone, code: reg.body.devCode });
        expect(otpVerify.status).toBe(200);
        const login = await http
            .post('/api/v1/auth/login')
            .send({ identifier: phone, password });
        expect(login.status).toBe(200);
        const setCookie = login.headers['set-cookie'];
        const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
        const refresh = await http.post('/api/v1/auth/refresh').set('Cookie', cookieStr);
        expect(refresh.status).toBe(200);
        const newCookie = refresh.headers['set-cookie'];
        const newCookieStr = Array.isArray(newCookie) ? newCookie[0] : newCookie;
        const logout = await http.post('/api/v1/auth/logout').set('Cookie', newCookieStr);
        expect(logout.status).toBe(200);
        const afterLogout = await http
            .post('/api/v1/auth/refresh')
            .set('Cookie', newCookieStr);
        expect(afterLogout.status).toBe(401);
    }, 30000);
    it('rejects login with wrong password', async () => {
        await (0, helpers_1.cleanDatabase)(prisma, redis);
        const phone = (0, helpers_1.randomPhone)();
        const password = 'CorrectPass123!';
        const http = (0, supertest_1.default)(app.getHttpServer());
        console.log('=== Registering phone #2:', phone);
        const reg = await http
            .post('/api/v1/auth/register')
            .send({ phone, fullName: 'Wrong Pass Test', password });
        console.log('=== Register #2 response:', reg.status, JSON.stringify(reg.body));
        if (reg.status !== 201) {
            throw new Error(`Register #2 failed with ${reg.status}: ${JSON.stringify(reg.body)}`);
        }
        const verify = await http
            .post('/api/v1/auth/otp/verify')
            .send({ phone, code: reg.body.devCode });
        expect(verify.status).toBe(200);
        const badLogin = await http
            .post('/api/v1/auth/login')
            .send({ identifier: phone, password: 'WrongPassword!' });
        expect(badLogin.status).toBe(401);
    }, 30000);
});
//# sourceMappingURL=auth.e2e-spec.js.map