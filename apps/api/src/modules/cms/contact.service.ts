// apps/api/src/modules/cms/contact.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  ContactMessageDto,
  ContactMessageStatus,
  CreateContactMessageDto,
} from '@ecommarce/types';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(dto: CreateContactMessageDto): Promise<ContactMessageDto> {
    const m = await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone ?? null,
        orderNo: dto.orderNo ?? null,
        subject: dto.subject,
        message: dto.message,
      },
    });
    return this.toDto(m);
  }

  async list(): Promise<ContactMessageDto[]> {
    const rows = await this.prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((m) => this.toDto(m));
  }

  async updateStatus(id: string, status: ContactMessageStatus): Promise<ContactMessageDto> {
    const m = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('contact message not found');
    const updated = await this.prisma.contactMessage.update({
      where: { id },
      data: { status },
    });
    return this.toDto(updated);
  }

  async reply(id: string, replyBody: string): Promise<ContactMessageDto> {
    const m = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('contact message not found');
    const updated = await this.prisma.contactMessage.update({
      where: { id },
      data: { replyBody, repliedAt: new Date(), status: 'RESOLVED' },
    });
    return this.toDto(updated);
  }

  private toDto(r: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    orderNo: string | null;
    subject: string;
    message: string;
    status: string;
    replyBody: string | null;
    repliedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ContactMessageDto {
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      orderNo: r.orderNo,
      subject: r.subject,
      message: r.message,
      status: r.status as ContactMessageStatus,
      replyBody: r.replyBody,
      repliedAt: r.repliedAt ? r.repliedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}