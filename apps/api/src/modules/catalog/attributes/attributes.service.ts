// apps/api/src/modules/catalog/attributes/attributes.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { slugify } from '../../../common/utils/slugify';
import type {
  AttachAttributeDto,
  AttributeDto,
  CategoryAttributeDto,
  CreateAttributeDto,
  UpdateAttributeDto,
} from '@ecommarce/types';

@Injectable()
export class AttributesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAttributeDto): Promise<AttributeDto> {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.nameEn);
    const existing = await this.prisma.attribute.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException(`slug already exists: ${slug}`);

    const created = await this.prisma.attribute.create({
      data: {
        nameEn: dto.nameEn,
        nameBn: dto.nameBn,
        slug,
        type: dto.type,
        unit: dto.unit ?? null,
        options: (dto.options as unknown as object) ?? undefined,
        isVariant: dto.isVariant ?? false,
        isFilterable: dto.isFilterable ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return this.castAttribute(created);
  }

  async update(id: string, dto: UpdateAttributeDto): Promise<AttributeDto> {
    const current = await this.prisma.attribute.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('attribute not found');

    const data: Record<string, unknown> = {};
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.nameBn !== undefined) data.nameBn = dto.nameBn;
    if (dto.slug !== undefined) data.slug = slugify(dto.slug);
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.unit !== undefined) data.unit = dto.unit;
    if (dto.options !== undefined) data.options = dto.options;
    if (dto.isVariant !== undefined) data.isVariant = dto.isVariant;
    if (dto.isFilterable !== undefined) data.isFilterable = dto.isFilterable;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    const updated = await this.prisma.attribute.update({ where: { id }, data });
    return this.castAttribute(updated);
  }

  async list(): Promise<AttributeDto[]> {
    const rows = await this.prisma.attribute.findMany({
      orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
    });
    return rows.map((r) => this.castAttribute(r));
  }

  async findOne(id: string): Promise<AttributeDto> {
    const row = await this.prisma.attribute.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('attribute not found');
    return this.castAttribute(row);
  }

  async attachToCategory(
    categoryId: string,
    dto: AttachAttributeDto,
  ): Promise<CategoryAttributeDto> {
    const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) throw new NotFoundException('category not found');
    const attr = await this.prisma.attribute.findUnique({ where: { id: dto.attributeId } });
    if (!attr) throw new NotFoundException('attribute not found');

    const created = await this.prisma.categoryAttribute.upsert({
      where: { categoryId_attributeId: { categoryId, attributeId: dto.attributeId } },
      create: {
        categoryId,
        attributeId: dto.attributeId,
        isRequired: dto.isRequired ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
      update: {
        isRequired: dto.isRequired ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { attribute: true },
    });
    return {
      id: created.id,
      categoryId: created.categoryId,
      attributeId: created.attributeId,
      isRequired: created.isRequired,
      sortOrder: created.sortOrder,
      attribute: this.castAttribute(created.attribute),
    };
  }

  async detachFromCategory(categoryId: string, attributeId: string): Promise<{ ok: true }> {
    await this.prisma.categoryAttribute.delete({
      where: { categoryId_attributeId: { categoryId, attributeId } },
    });
    return { ok: true };
  }

  async listForCategory(categoryId: string): Promise<CategoryAttributeDto[]> {
    const rows = await this.prisma.categoryAttribute.findMany({
      where: { categoryId },
      include: { attribute: true },
      orderBy: [{ sortOrder: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      categoryId: r.categoryId,
      attributeId: r.attributeId,
      isRequired: r.isRequired,
      sortOrder: r.sortOrder,
      attribute: this.castAttribute(r.attribute),
    }));
  }

  private castAttribute(row: {
    id: string;
    nameEn: string;
    nameBn: string;
    slug: string;
    type: string;
    unit: string | null;
    options: unknown;
    isVariant: boolean;
    isFilterable: boolean;
    sortOrder: number;
  }): AttributeDto {
    return {
      id: row.id,
      nameEn: row.nameEn,
      nameBn: row.nameBn,
      slug: row.slug,
      type: row.type as AttributeDto['type'],
      unit: row.unit,
      options: Array.isArray(row.options) ? (row.options as string[]) : null,
      isVariant: row.isVariant,
      isFilterable: row.isFilterable,
      sortOrder: row.sortOrder,
    };
  }
}