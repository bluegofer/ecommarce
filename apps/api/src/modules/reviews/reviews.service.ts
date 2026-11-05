// apps/api/src/modules/reviews/reviews.service.ts
// Verified-purchase review system (TDD §6.10).
//   - Only customers with a DELIVERED order item for the product can review
//   - One review per customer per product (enforced by @@unique)
//   - Aggregate rating on products is maintained incrementally in the SAME
//     transaction as publish/hide so listing counts are always correct.
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { containsProfanity } from './profanity';
import type {
  AdminReplyDto,
  CreateReviewDto,
  ModerateReviewDto,
  PaginatedReviewsDto,
  ReviewDto,
  ReviewListQueryDto,
  ReviewStatus,
  ReviewSummaryDto,
  UpdateReviewDto,
} from '@ecommarce/types';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Create — verified purchase only
  // -------------------------------------------------------------------------

  async create(userId: string, dto: CreateReviewDto): Promise<ReviewDto> {
    // Resolve the authenticated user to their Customer row (the FK we store).
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) {
      throw new ForbiddenException('No customer profile for this user');
    }
    const customerId = customer.id;

    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('rating must be 1..5');
    }
    if (!dto.body || dto.body.trim().length < 3) {
      throw new BadRequestException('review body too short');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('product not found');

    // Verified-purchase check: customer must have a DELIVERED order item
    // for this product.
    const verified = await this.findVerifiedDeliveredOrderForProduct(
      customerId,
      dto.productId,
    );
    if (!verified) {
      throw new ForbiddenException(
        'Only customers with a delivered order can review this product',
      );
    }

    const existing = await this.prisma.review.findUnique({
      where: { productId_customerId: { productId: dto.productId, customerId } },
    });
    if (existing) {
      throw new BadRequestException('You have already reviewed this product');
    }

    const profanity = containsProfanity(`${dto.title ?? ''} ${dto.body}`);

    const review = await this.prisma.review.create({
      data: {
        productId: dto.productId,
        customerId,
        orderId: verified.orderId,
        variantId: dto.variantId ?? verified.variantId,
        rating: dto.rating,
        title: dto.title ?? null,
        body: dto.body.trim(),
        photoUrls: (dto.photoUrls as unknown as object) ?? undefined,
        status: 'PENDING',
        isVerified: true,
        // if profanity found, auto-hide — otherwise normal moderation queue
        hiddenReason: profanity ? 'auto: profanity detected' : null,
      },
    });
    if (profanity) {
      await this.prisma.review.update({
        where: { id: review.id },
        data: { status: 'HIDDEN' },
      });
    }
    return this.findOne(review.id);
  }

  // -------------------------------------------------------------------------
  // Update own review (only PENDING/HIDDEN within edit window)
  // -------------------------------------------------------------------------

  async updateOwn(
    userId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<ReviewDto> {
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new ForbiddenException('No customer profile');
    const customerId = customer.id;
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('review not found');
    if (review.customerId !== customerId) {
      throw new ForbiddenException('Not your review');
    }
    if (review.status === 'PUBLISHED') {
      throw new BadRequestException('Published reviews cannot be edited');
    }
    const data: Record<string, unknown> = {};
    if (dto.rating !== undefined) {
      if (dto.rating < 1 || dto.rating > 5) {
        throw new BadRequestException('rating must be 1..5');
      }
      data.rating = dto.rating;
    }
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.body !== undefined) data.body = dto.body.trim();
    if (dto.photoUrls !== undefined) data.photoUrls = dto.photoUrls;

    await this.prisma.review.update({ where: { id: reviewId }, data });
    return this.findOne(reviewId);
  }

  // -------------------------------------------------------------------------
  // Read — public listing (published only)
  // -------------------------------------------------------------------------

  async listByProduct(query: ReviewListQueryDto): Promise<PaginatedReviewsDto> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(96, Math.max(1, query.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (query.productId) where.productId = query.productId;
    if (query.status) where.status = query.status;
    if (query.minRating !== undefined) where.rating = { gte: query.minRating };

    const [total, rows] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: [{ helpfulCount: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((r) => this.toDto(r)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string): Promise<ReviewDto> {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('review not found');
    return this.toDto(review);
  }

  async summary(productId: string): Promise<ReviewSummaryDto> {
    const rows = await this.prisma.review.findMany({
      where: { productId, status: 'PUBLISHED' },
      select: { rating: true },
    });
    const histogram: Record<'1' | '2' | '3' | '4' | '5', number> = {
      '1': 0, '2': 0, '3': 0, '4': 0, '5': 0,
    };
    let sum = 0;
    for (const r of rows) {
      sum += r.rating;
      const k = String(r.rating) as '1' | '2' | '3' | '4' | '5';
      histogram[k] += 1;
    }
    const totalCount = rows.length;
    return {
      avgRating: totalCount > 0 ? Number((sum / totalCount).toFixed(2)) : 0,
      totalCount,
      histogram,
    };
  }

  // -------------------------------------------------------------------------
  // Helpful vote (idempotent — one vote per customer per review)
  // -------------------------------------------------------------------------

  async voteHelpful(userId: string, reviewId: string): Promise<{ helpfulCount: number }> {
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new NotFoundException('No customer profile');
    const customerId = customer.id;
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('review not found');
    if (review.status !== 'PUBLISHED') {
      throw new BadRequestException('Cannot vote on unpublished reviews');
    }
    const existing = await this.prisma.reviewVote.findUnique({
      where: { reviewId_customerId: { reviewId, customerId } },
    });
    if (existing) {
      return { helpfulCount: review.helpfulCount };
    }
    await this.prisma.reviewVote.create({
      data: { reviewId, customerId, helpful: true },
    });
    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { helpfulCount: { increment: 1 } },
    });
    return { helpfulCount: updated.helpfulCount };
  }

  async listByCustomer(userId: string): Promise<ReviewDto[]> {
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) return [];
    const rows = await this.prisma.review.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  // -------------------------------------------------------------------------
  // Moderation (used by ModerationService inside a transaction)
  // -------------------------------------------------------------------------

  /**
   * Recompute the aggregate rating on a product from published reviews.
   * MUST run inside the same transaction that flips review status
   * (TDD §6.10).
   */
  async recomputeProductAggregate(
    productId: string,
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0] | PrismaService = this.prisma,
  ): Promise<void> {
    const rows = await tx.review.findMany({
      where: { productId, status: 'PUBLISHED' },
      select: { rating: true },
    });
    const count = rows.length;
    const avg = count > 0 ? rows.reduce((s, r) => s + r.rating, 0) / count : 0;
    await tx.product.update({
      where: { id: productId },
      data: {
        avgRating: Number(avg.toFixed(2)),
        ratingCount: count,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async findVerifiedDeliveredOrderForProduct(
    customerId: string,
    productId: string,
  ): Promise<{ orderId: string; variantId: string | null } | null> {
    // Delivered order items where the variant's product matches productId
    const rows = await this.prisma.orderItem.findMany({
      where: {
        order: {
          customerId,
          status: 'DELIVERED',
        },
      },
      include: {
        order: { select: { id: true } },
      },
    });
    for (const item of rows) {
      const variant = await this.prisma.variant.findUnique({
        where: { id: item.variantId },
        select: { productId: true },
      });
      if (variant?.productId === productId) {
        return { orderId: item.order.id, variantId: item.variantId };
      }
    }
    return null;
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