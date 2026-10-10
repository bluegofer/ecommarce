// packages/types/src/purchase.ts
// Purchase requisition -> PO -> invoice -> GRN. All money = integer poisha.

export type PurchaseRequisitionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED';
export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'SENT'
  | 'PARTIAL_RECEIVED'
  | 'RECEIVED'
  | 'CLOSED'
  | 'CANCELLED';
export type PurchaseInvoiceStatus = 'DRAFT' | 'POSTED' | 'PARTIAL_PAID' | 'PAID' | 'VOID';
export type GRNStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

// --- Requisition ---

export interface PurchaseRequisitionItemDto {
  id: string;
  requisitionId: string;
  variantId: string;
  requestedQty: number;
  notes: string | null;
  createdAt: string;
}

export interface PurchaseRequisitionDto {
  id: string;
  reqNumber: string;
  branchId: string;
  status: PurchaseRequisitionStatus;
  notes: string | null;
  requestedById: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  items: PurchaseRequisitionItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequisitionItemInput {
  variantId: string;
  requestedQty: number;
  notes?: string;
}

export interface CreateRequisitionInput {
  branchId: string;
  notes?: string;
  items: CreateRequisitionItemInput[];
}

// --- Purchase Order ---

export interface PurchaseOrderItemDto {
  id: string;
  poId: string;
  variantId: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
  lineTotal: number;
  notes: string | null;
  createdAt: string;
}

export interface PurchaseOrderDto {
  id: string;
  poNumber: string;
  supplierId: string;
  branchId: string;
  requisitionId: string | null;
  status: PurchaseOrderStatus;
  expectedDate: string | null;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  createdById: string | null;
  sentAt: string | null;
  closedAt: string | null;
  items: PurchaseOrderItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderItemInput {
  variantId: string;
  orderedQty: number;
  unitCost: number;
  notes?: string;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  branchId: string;
  requisitionId?: string;
  expectedDate?: string;
  discount?: number;
  notes?: string;
  items: CreatePurchaseOrderItemInput[];
}

// --- Purchase Invoice ---

export interface PurchaseInvoiceDto {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  purchaseOrderId: string | null;
  invoiceDate: string;
  dueDate: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  status: PurchaseInvoiceStatus;
  notes: string | null;
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseInvoiceInput {
  invoiceNumber: string;
  supplierId: string;
  purchaseOrderId?: string;
  invoiceDate: string;
  dueDate?: string;
  subtotal: number;
  discount?: number;
  tax?: number;
  notes?: string;
}

// --- GRN ---

export interface GRNItemDto {
  id: string;
  grnId: string;
  poItemId: string | null;
  variantId: string;
  receivedQty: number;
  unitCost: number;
  lineTotal: number;
  notes: string | null;
  createdAt: string;
}

export interface GRNDto {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  branchId: string;
  status: GRNStatus;
  receivedById: string | null;
  receivedAt: string | null;
  notes: string | null;
  items: GRNItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGRNItemInput {
  poItemId?: string;
  variantId: string;
  receivedQty: number;
  unitCost: number;
  notes?: string;
}

export interface CreateGRNInput {
  purchaseOrderId: string;
  branchId: string;
  notes?: string;
  items: CreateGRNItemInput[];
}