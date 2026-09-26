// packages/types/src/orders.ts
// Order, cart, payment, shipment DTOs. All money = integer poisha.

export type OrderStatus =
  | 'PLACED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED';

export type PaymentMethod = 'BKASH' | 'NAGAD' | 'SSLCOMMERZ' | 'COD';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type ShipmentStatus = 'PENDING' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED';

export interface CartItemDto {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
  savedForLater: boolean;
  // Hydrated fields (from variant+product):
  productId?: string;
  productSlug?: string;
  titleEn?: string;
  titleBn?: string;
  pricePoisha?: number;
  stock?: number;
  sku?: string;
  imageUrl?: string | null;
  lineTotalPoisha?: number;
}

export interface CartDto {
  id: string;
  customerId: string | null;
  guestToken: string | null;
  couponCode: string | null;
  items: CartItemDto[];
  savedForLater: CartItemDto[];
  subtotalPoisha: number;
  discountPoisha: number;
  deliveryChargePoisha: number;
  totalPoisha: number;
}

export interface AddCartItemDto {
  variantId: string;
  quantity: number;
}

export interface UpdateCartItemDto {
  quantity?: number;
  savedForLater?: boolean;
}

export interface ApplyCouponDto {
  couponCode: string;
}

export interface AddressDto {
  id: string;
  customerId: string;
  label: string | null;
  recipientName: string;
  phone: string;
  area: string;
  city: string;
  postcode: string | null;
  line1: string;
  line2: string | null;
  isDefault: boolean;
}

export interface CreateAddressDto {
  label?: string;
  recipientName: string;
  phone: string;
  area: string;
  city: string;
  postcode?: string;
  line1: string;
  line2?: string;
  isDefault?: boolean;
}

export type UpdateAddressDto = Partial<CreateAddressDto>;

export interface OrderItemDto {
  id: string;
  orderId: string;
  variantId: string;
  productTitleEn: string;
  productTitleBn: string;
  variantSnapshot: Record<string, unknown>;
  quantity: number;
  unitPricePoisha: number;
  lineTotalPoisha: number;
}

export interface OrderStatusHistoryDto {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorUserId: string | null;
  note: string | null;
  createdAt: string;
}

export interface OrderNoteDto {
  id: string;
  orderId: string;
  body: string;
  isCustomerVisible: boolean;
  actorUserId: string | null;
  createdAt: string;
}

export interface PaymentDto {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountPoisha: number;
  gatewayRef: string | null;
  paidAt: string | null;
  refundedPoisha: number;
  createdAt: string;
}

export interface ShipmentDto {
  id: string;
  orderId: string;
  courier: string;
  trackingNumber: string | null;
  status: ShipmentStatus;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  subtotalPoisha: number;
  discountPoisha: number;
  deliveryChargePoisha: number;
  totalPoisha: number;
  couponCode: string | null;
  shippingAddressJson: Record<string, unknown>;
  contactPhone: string;
  contactEmail: string | null;
  customerNote: string | null;
  cancelReason: string | null;
  placedAt: string;
  confirmedAt: string | null;
  processingAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  items: OrderItemDto[];
  statusHistory: OrderStatusHistoryDto[];
  notes: OrderNoteDto[];
  payments: PaymentDto[];
  shipments: ShipmentDto[];
}

export interface OrderSummaryDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalPoisha: number;
  placedAt: string;
  itemCount: number;
  contactPhone: string;
  shippingCity: string;
}

export interface PaginatedOrdersDto {
  items: OrderSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface OrderListQueryDto {
  status?: OrderStatus;
  customerId?: string;
  phone?: string;
  q?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface CheckoutItemInputDto {
  variantId: string;
  quantity: number;
}

export interface PlaceOrderDto {
  items: CheckoutItemInputDto[];
  shippingAddress: CreateAddressDto;
  contactPhone: string;
  contactEmail?: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  customerNote?: string;
  guestEmail?: string;
  guestPhone?: string;
}

export interface PlaceOrderResultDto {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  totalPoisha: number;
  paymentMethod: PaymentMethod;
}

export interface GuestOrderLookupDto {
  orderNumber: string;
  phone: string;
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
  note?: string;
}

export interface AssignRiderDto {
  riderName: string;
  riderPhone?: string;
}

export interface AddOrderNoteDto {
  body: string;
  isCustomerVisible?: boolean;
}

export interface CancelOrderDto {
  reason: string;
}

export interface DeliveryChargePreviewDto {
  city: string;
  area: string;
  subtotalPoisha: number;
}