// apps/api/src/modules/auth/users.controller.ts
//
// Staff-user management endpoints (read-only list for now).
// - GET /api/v1/users      list all staff users with their roles
// - GET /api/v1/users/:id  fetch a single staff user
//
// These are used by the admin console's "Users & Roles" page
// (apps/admin/src/app/(dashboard)/settings/users/page.tsx).
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'HR_MANAGER')
  async list() {
    const rows = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        userRoles: { include: { role: { select: { code: true } } } },
      },
    });
    return rows.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      status: u.status,
      roles: u.userRoles.map((ur) => ur.role.code),
      lastLoginAt: null as string | null, // not tracked yet
    }));
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'HR_MANAGER')
  async findOne(@Param('id') id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: { include: { role: { select: { code: true } } } },
      },
    });
    if (!u) throw new NotFoundException('user not found');
    return {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      status: u.status,
      roles: u.userRoles.map((ur) => ur.role.code),
      lastLoginAt: null as string | null,
    };
  }
}