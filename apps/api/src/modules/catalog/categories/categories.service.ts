// apps/api/src/modules/catalog/categories/categories.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { slugify } from '../../../common/utils/slugify';
import type {
  CategoryDto,
  CategoryTreeNode,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '@ecommarce/types';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto): Promise<CategoryDto> {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.nameEn);
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException(`slug already exists: ${slug}`);

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new BadRequestException('parent category not found');
    }

    return this.prisma.category.create({
      data: {
        parentId: dto.parentId ?? null,
        nameEn: dto.nameEn,
        nameBn: dto.nameBn,
        slug,
        descriptionEn: dto.descriptionEn ?? null,
        descriptionBn: dto.descriptionBn ?? null,
        imageUrl: dto.imageUrl ?? null,
        iconName: dto.iconName ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        metaTitle: dto.metaTitle ?? null,
        metaDescription: dto.metaDescription ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDto> {
    const current = await this.prisma.category.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('category not found');

    const data: Record<string, unknown> = {};
    if (dto.parentId !== undefined) data.parentId = dto.parentId;
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.nameBn !== undefined) data.nameBn = dto.nameBn;
    if (dto.descriptionEn !== undefined) data.descriptionEn = dto.descriptionEn;
    if (dto.descriptionBn !== undefined) data.descriptionBn = dto.descriptionBn;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.iconName !== undefined) data.iconName = dto.iconName;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.metaTitle !== undefined) data.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined) data.metaDescription = dto.metaDescription;
    if (dto.slug !== undefined) data.slug = slugify(dto.slug);

    return this.prisma.category.update({ where: { id }, data });
  }

  async findOne(id: string): Promise<CategoryDto> {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('category not found');
    return cat;
  }

  async findBySlug(slug: string): Promise<CategoryDto | null> {
    return this.prisma.category.findUnique({ where: { slug } });
  }

  async list(): Promise<CategoryDto[]> {
    return this.prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }] });
  }

  async tree(): Promise<CategoryTreeNode[]> {
    const all = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
    });
    const map = new Map<string, CategoryTreeNode>();
    for (const c of all) map.set(c.id, { ...c, children: [] });
    const roots: CategoryTreeNode[] = [];
    for (const c of all) {
      const node = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async remove(id: string): Promise<{ ok: true }> {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('category not found');
    const childCount = await this.prisma.category.count({ where: { parentId: id } });
    if (childCount > 0) throw new BadRequestException('cannot delete: has child categories');
    const productCount = await this.prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) throw new BadRequestException('cannot delete: has products');
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }
}