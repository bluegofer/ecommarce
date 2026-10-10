// apps/api/src/modules/auth/users.controller.ts
//
// Staff-user management endpoints.
// - GET    /api/v1/users          list all staff users with their roles
// - GET    /api/v1/users/:id      fetch a single staff user
// - POST   /api/v1/users          create new staff user (ADMIN/EDITOR = SUPER_ADMIN only)
// - PATCH  /api/v1/users/:id/roles  assign role set
// - PATCH  /api/v1/users/:id/status toggle ACTIVE/SUSPENDED
//
// Used by the admin console's "Users & Roles" page.
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface RequestUser {
  userId: string;
  roles: string[];
}

interface CreateUserDto {
  phone: string;
  fullName: string;
  email?: string;
  roles: string[];
}

// Roles that only SUPER_ADMIN can assign.
const SUPER_ADMIN_ONLY_ROLES = ['SUPER_ADMIN', 'ADMIN', 'EDITOR'];

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'HR_MANAGER', 'ADMIN')
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
      lastLoginAt: null as string | null,
    }));
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'HR_MANAGER', 'ADMIN')
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

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: RequestUser | null,
  ) {
    if (!dto.phone || !dto.fullName || !Array.isArray(dto.roles) || dto.roles.length === 0) {
      throw new BadRequestException('phone, fullName, roles[] are required');
    }

    // Rule: SUPER_ADMIN-only roles can only be assigned by SUPER_ADMIN.
    const assignerRoles = user?.roles ?? [];
    const assignerIsSuperAdmin = assignerRoles.includes('SUPER_ADMIN');
    const wantsPrivilegedRole = dto.roles.some((r) => SUPER_ADMIN_ONLY_ROLES.includes(r));
    if (wantsPrivilegedRole && !assignerIsSuperAdmin) {
      throw new BadRequestException(
        `Only SUPER_ADMIN can assign roles: ${SUPER_ADMIN_ONLY_ROLES.join(', ')}`,
      );
    }

    // Reject duplicates
    const exists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (exists) throw new BadRequestException('phone already registered');

    // Resolve role IDs
    const roleRows = await this.prisma.role.findMany({
      where: { code: { in: dto.roles } },
      select: { id: true, code: true },
    });
    const foundCodes = roleRows.map((r) => r.code);
    const missing = dto.roles.filter((r) => !foundCodes.includes(r));
    if (missing.length > 0) {
      throw new BadRequestException(`unknown role codes: ${missing.join(', ')}`);
    }

    const passwordHash = await bcrypt.hash('ChangeMe!2026', 12);

    const created = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        fullName: dto.fullName,
        email: dto.email ?? null,
        passwordHash,
        status: 'ACTIVE',
        userRoles: {
          create: roleRows.map((r) => ({ roleId: r.id })),
        },
      },
      include: {
        userRoles: { include: { role: { select: { code: true } } } },
      },
    });

    return {
      id: created.id,
      fullName: created.fullName,
      email: created.email,
      phone: created.phone,
      status: created.status,
      roles: created.userRoles.map((ur) => ur.role.code),
      lastLoginAt: null as string | null,
    };
  }

  @Patch(':id/roles')
  @Roles('SUPER_ADMIN')
  async updateRoles(
    @Param('id') id: string,
    @Body() body: { roles: string[] },
  ) {
    if (!Array.isArray(body.roles) || body.roles.length === 0) {
      throw new BadRequestException('roles[] required');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('user not found');

    const roleRows = await this.prisma.role.findMany({
      where: { code: { in: body.roles } },
      select: { id: true, code: true },
    });
    const foundCodes = roleRows.map((r) => r.code);
    const missing = body.roles.filter((r) => !foundCodes.includes(r));
    if (missing.length > 0) {
      throw new BadRequestException(`unknown role codes: ${missing.join(', ')}`);
    }

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: roleRows.map((r) => ({ userId: id, roleId: r.id })),
      }),
    ]);

    return { ok: true, roles: foundCodes };
  }

  @Patch(':id/status')
  @Roles('SUPER_ADMIN')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'SUSPENDED' },
  ) {
    if (body.status !== 'ACTIVE' && body.status !== 'SUSPENDED') {
      throw new BadRequestException('status must be ACTIVE or SUSPENDED');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('user not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: body.status },
    });
    return { ok: true, status: updated.status };
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  async deactivate(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('user not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });
    return { ok: true, status: updated.status };
  }
}