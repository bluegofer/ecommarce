// packages/types/src/suppliers.ts
// Supplier / vendor DTOs. All money = integer poisha (BDT).

export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
export type SupplierPaymentMethod = 'CASH' | 'BANK' | 'MFS';

export interface SupplierDto {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: unknown | null;
  taxId: string | null;
  paymentTerms: string | null;
  notes: string | null;
  openingBalance: number;
  currentDue: number;
  status: SupplierStatus;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierInput {
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: unknown;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  openingBalance?: number;
}

export interface UpdateSupplierInput {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: unknown;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  status?: SupplierStatus;
}

export interface SupplierPaymentDto {
  id: string;
  paymentNumber: string;
  supplierId: string;
  purchaseInvoiceId: string | null;
  amount: number;
  method: SupplierPaymentMethod;
  ledgerAccountId: string | null;
  journalEntryId: string | null;
  reference: string | null;
  paidAt: string;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
}

export interface RecordSupplierPaymentInput {
  supplierId: string;
  purchaseInvoiceId?: string;
  amount: number;
  method: SupplierPaymentMethod;
  ledgerAccountId?: string;
  reference?: string;
  paidAt?: string;   // ISO; defaults to now
  notes?: string;
}

export interface SupplierPerformanceDto {
  supplierId: string;
  totalOrders: number;
  totalReceived: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  averageLeadTimeDays: number;
  fulfillmentRate: number;   // 0..1 (receivedQty / orderedQty across POs)
}