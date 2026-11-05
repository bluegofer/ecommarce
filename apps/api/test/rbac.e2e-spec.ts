import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { Roles } from '../src/common/decorators/roles.decorator';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

/**
 * AC-45: RBAC denies wrong role on an admin-only endpoint.
 * We register a sample controller in the test module and assert 401 vs 403.
 */
@Controller('sample-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
class SampleAdminController {
  @Get('catalog-only')
  @Roles('CATALOG_MANAGER')
  catalogOnly() {
    return { ok: true, scope: 'catalog' };
  }
}

describe('RBAC (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
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
    await request(app.getHttpServer())
      .get('/api/v1/sample-admin/catalog-only')
      .expect(401);
  });

  it('returns 401 for an invalid token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/sample-admin/catalog-only')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });
});