// apps/api/src/modules/reviews/moderation.service.ts
// Admin moderation — publish/hide with mandatory reason, transactional
// aggregate recompute, public admin replies.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { ReviewDto, ReviewStatus } from '@ecommarce/types';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async queue(status: ReviewStatus = 'PENDING'): Promise<ReviewDto[]> {
    const rows = await this.prisma.review.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return rows.map((r) => this.toDto(r));
  }

  /**
   * Publish or hide a review. Both flip the status AND recompute the
   * product aggregate inside ONE transaction (TDD §6.10).
   */
  async moderate(
    reviewId: string,
    status: 'PUBLISHED' | 'HIDDEN',
    hiddenReason?: string,
  ): Promise<ReviewDto> {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('review not found');
    if (status === 'HIDDEN' && !hiddenReason) {
      throw new BadRequestException('hiddenReason is required when hiding');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: reviewId },
        data: {
          status,
          hiddenReason: status === 'HIDDEN' ? hiddenReason ?? null : null,
        },
      });
      // Recompute in same tx
      const rows = await tx.review.findMany({
        where: { productId: review.productId, status: 'PUBLISHED' },
        select: { rating: true },
      });
      const count = rows.length;
      const avg = count > 0 ? rows.reduce((s, r) => s + r.rating, 0) / count : 0;
      await tx.product.update({
        where: { id: review.productId },
        data: {
          avgRating: Number(avg.toFixed(2)),
          ratingCount: count,
        },
      });
    });

    const updated = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!updated) throw new NotFoundException('review not found after update');
    return this.toDto(updated);
  }

  async reply(reviewId: string, reply: string): Promise<ReviewDto> {
    if (!reply || reply.trim().length < 1) {
      throw new BadRequestException('reply body required');
    }
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('review not found');
    await this.prisma.review.update({
      where: { id: reviewId },
      data: { adminReply: reply.trim(), adminRepliedAt: new Date() },
    });
    return this.toDto((await this.prisma.review.findUnique({ where: { id: reviewId } }))!);
  }

  private toDto(r: {
    id: string;
    productId: string;
    customerId: string;
    orderId: string | null;
    variantId: string | null;
    rating: number;
    title: string | null;
    body: string;
    photoUrls: unknown;
    status: string;
    hiddenReason: string | null;
    helpfulCount: number;
    isVerified: boolean;
    adminReply: string | null;
    adminRepliedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ReviewDto {
    return {
      id: r.id,
      productId: r.productId,
      customerId: r.customerId,
      orderId: r.orderId,
      variantId: r.variantId,
      rating: r.rating,
      title: r.title,
      body: r.body,
      photoUrls: Array.isArray(r.photoUrls) ? (r.photoUrls as string[]) : null,
      status: r.status as ReviewStatus,
      hiddenReason: r.hiddenReason,
      helpfulCount: r.helpfulCount,
      isVerified: r.isVerified,
      adminReply: r.adminReply,
      adminRepliedAt: r.adminRepliedAt ? r.adminRepliedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}