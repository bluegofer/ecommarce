// apps/api/src/modules/cms/menus.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  CmsMenuDto,
  CmsMenuItemDto,
  CmsMenuLocation,
  UpsertMenuItemDto,
} from '@ecommarce/types';

@Injectable()
export class MenusService {
  constructor(private readonly prisma: PrismaService) {}

  async getByLocation(location: CmsMenuLocation): Promise<CmsMenuDto | null> {
    const menu = await this.prisma.cmsMenu.findUnique({
      where: { location },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!menu) return null;
    return {
      id: menu.id,
      location: menu.location as CmsMenuLocation,
      name: menu.name,
      items: this.buildTree(menu.items),
    };
  }

  async upsertMenu(location: CmsMenuLocation, name: string): Promise<CmsMenuDto> {
    const menu = await this.prisma.cmsMenu.upsert({
      where: { location },
      create: { location, name },
      update: { name },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    return {
      id: menu.id,
      location: menu.location as CmsMenuLocation,
      name: menu.name,
      items: this.buildTree(menu.items),
    };
  }

  async addItem(location: CmsMenuLocation, dto: UpsertMenuItemDto): Promise<CmsMenuItemDto> {
    const menu = await this.prisma.cmsMenu.findUnique({ where: { location } });
    if (!menu) throw new NotFoundException('menu not found — create it first');
    const item = await this.prisma.cmsMenuItem.create({
      data: {
        menuId: menu.id,
        parentId: dto.parentId ?? null,
        labelEn: dto.labelEn,
        labelBn: dto.labelBn,
        url: dto.url,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    return this.itemToDto(item);
  }

  async updateItem(id: string, dto: Partial<UpsertMenuItemDto>): Promise<CmsMenuItemDto> {
    const data: Record<string, unknown> = {};
    if (dto.labelEn !== undefined) data.labelEn = dto.labelEn;
    if (dto.labelBn !== undefined) data.labelBn = dto.labelBn;
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.parentId !== undefined) data.parentId = dto.parentId;
    const item = await this.prisma.cmsMenuItem.update({ where: { id }, data });
    return this.itemToDto(item);
  }

  async removeItem(id: string): Promise<{ ok: true }> {
    await this.prisma.cmsMenuItem.delete({ where: { id } });
    return { ok: true };
  }

  private itemToDto(r: {
    id: string;
    menuId: string;
    parentId: string | null;
    labelEn: string;
    labelBn: string;
    url: string;
    sortOrder: number;
    isActive: boolean;
  }): CmsMenuItemDto {
    return {
      id: r.id,
      menuId: r.menuId,
      parentId: r.parentId,
      labelEn: r.labelEn,
      labelBn: r.labelBn,
      url: r.url,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
    };
  }

  private buildTree(
    rows: Array<{
      id: string;
      menuId: string;
      parentId: string | null;
      labelEn: string;
      labelBn: string;
      url: string;
      sortOrder: number;
      isActive: boolean;
    }>,
  ): CmsMenuItemDto[] {
    const map = new Map<string, CmsMenuItemDto>();
    for (const r of rows) map.set(r.id, { ...this.itemToDto(r), children: [] });
    const roots: CmsMenuItemDto[] = [];
    for (const r of rows) {
      const node = map.get(r.id)!;
      if (r.parentId && map.has(r.parentId)) {
        map.get(r.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }
}