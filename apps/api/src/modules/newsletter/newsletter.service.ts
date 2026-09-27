// apps/api/src/modules/newsletter/newsletter.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

interface SubscribeInput {
  email: string;
  name?: string;
  source?: string;
  locale?: string;
}

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async subscribe(input: SubscribeInput) {
    const email = this.normalizeEmail(input.email ?? '');
    if (!this.isValidEmail(email)) {
      throw new BadRequestException('Please provide a valid email address');
    }

    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      // Re-subscribe if previously unsubscribed
      if (!existing.isActive) {
        return this.prisma.newsletterSubscriber.update({
          where: { email },
          data: {
            isActive: true,
            unsubscribedAt: null,
            subscribedAt: new Date(),
          },
        });
      }
      // Already active — idempotent OK
      return existing;
    }

    return this.prisma.newsletterSubscriber.create({
      data: {
        email,
        name: input.name?.trim() || null,
        source: input.source?.slice(0, 40) || 'footer',
        locale: input.locale?.slice(0, 8) || null,
      },
    });
  }

  async list(limit = 500) {
    return this.prisma.newsletterSubscriber.findMany({
      where: { isActive: true },
      orderBy: { subscribedAt: 'desc' },
      take: Math.min(2000, Math.max(1, limit)),
    });
  }

  async unsubscribe(email: string) {
    const normalized = this.normalizeEmail(email);
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: normalized },
    });
    if (!existing) return { ok: true };
    await this.prisma.newsletterSubscriber.update({
      where: { email: normalized },
      data: { isActive: false, unsubscribedAt: new Date() },
    });
    return { ok: true };
  }

  async count() {
    return this.prisma.newsletterSubscriber.count({ where: { isActive: true } });
  }

  async deleteById(id: string) {
    return this.prisma.newsletterSubscriber.delete({ where: { id } });
  }}