// packages/types/src/notifications.ts

export type NotificationChannel = 'SMS' | 'EMAIL' | 'PUSH';
export type NotificationStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'SUPPRESSED';

export interface NotificationTemplateDto {
  id: string;
  key: string;
  channel: NotificationChannel;
  subjectEn: string | null;
  subjectBn: string | null;
  bodyEn: string;
  bodyBn: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertNotificationTemplateDto {
  key: string;
  channel: NotificationChannel;
  subjectEn?: string;
  subjectBn?: string;
  bodyEn: string;
  bodyBn: string;
  isActive?: boolean;
}

export interface NotificationLogDto {
  id: string;
  customerId: string | null;
  orderId: string | null;
  templateKey: string;
  channel: NotificationChannel;
  recipient: string;
  renderedSubject: string | null;
  renderedBody: string;
  status: NotificationStatus;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface DispatchNotificationDto {
  templateKey: string;
  channel: NotificationChannel;
  recipient: string;
  variables: Record<string, string>;
  customerId?: string;
  orderId?: string;
}

export interface BackInStockSubscribeDto {
  variantId: string;
  email?: string;
  phone?: string;
}