// packages/types/src/crm.ts
// CRM DTOs — customer profile, notes, segment engine, CSV export.

export type CustomerStatus = 'ACTIVE' | 'BLOCKED';

export interface CustomerDto {
  id: string;
  userId: string | null;
  phone: string;
  email: string | null;
  fullName: string;
  isGuest: boolean;
  status: CustomerStatus;
  totalOrders: number;
  totalSpentPoisha: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfileDto extends CustomerDto {
  addresses: Array<{
    id: string;
    recipientName: string;
    phone: string;
    area: string;
    city: string;
    line1: string;
    isDefault: boolean;
  }>;
  notesTimeline: Array<{
    id: string;
    body: string;
    createdAt: string;
    actorUserId: string | null;
  }>;
  orderSummary: {
    total: number;
    last5: Array<{
      id: string;
      orderNumber: string;
      status: string;
      totalPoisha: number;
      placedAt: string;
    }>;
  };
}

export interface AddCustomerNoteDto {
  body: string;
}

export interface SegmentFilterDto {
  minOrders?: number;
  minSpendPoisha?: number;
  lastOrderWithinDays?: number;
  noOrderInDays?: number;
  isGuest?: boolean;
  city?: string;
}

export interface SegmentDto {
  id: string;
  name: string;
  description: string | null;
  filterJson: SegmentFilterDto;
  isActive: boolean;
  estimatedCount: number;
  refreshedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSegmentDto {
  name: string;
  description?: string;
  filterJson: SegmentFilterDto;
  isActive?: boolean;
}

export interface UpdateSegmentDto extends Partial<CreateSegmentDto> {}