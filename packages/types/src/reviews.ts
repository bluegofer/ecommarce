// packages/types/src/reviews.ts

export type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'HIDDEN';

export interface ReviewDto {
  id: string;
  productId: string;
  customerId: string;
  orderId: string | null;
  variantId: string | null;
  rating: number;
  title: string | null;
  body: string;
  photoUrls: string[] | null;
  status: ReviewStatus;
  hiddenReason: string | null;
  helpfulCount: number;
  isVerified: boolean;
  adminReply: string | null;
  adminRepliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewDto {
  productId: string;
  orderId?: string;
  variantId?: string;
  rating: number;
  title?: string;
  body: string;
  photoUrls?: string[];
}

export interface UpdateReviewDto {
  rating?: number;
  title?: string;
  body?: string;
  photoUrls?: string[];
}

export interface ModerateReviewDto {
  status: 'PUBLISHED' | 'HIDDEN';
  hiddenReason?: string;
}

export interface AdminReplyDto {
  reply: string;
}

export interface ReviewListQueryDto {
  productId?: string;
  status?: ReviewStatus;
  minRating?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedReviewsDto {
  items: ReviewDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ReviewSummaryDto {
  avgRating: number;
  totalCount: number;
  histogram: Record<'1' | '2' | '3' | '4' | '5', number>;
}