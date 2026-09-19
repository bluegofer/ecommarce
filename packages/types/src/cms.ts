// packages/types/src/cms.ts
// Shared CMS DTOs — pages, sections, menus, announcements, popups, media, contact.

export type CmsPageStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CmsMenuLocation = 'HEADER' | 'FOOTER' | 'MOBILE';
export type ContactMessageStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'SPAM';

export interface CmsPageDto {
  id: string;
  slug: string;
  titleEn: string;
  titleBn: string;
  bodyEn: string | null;
  bodyBn: string | null;
  status: CmsPageStatus;
  publishedAt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  currentRevision: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCmsPageDto {
  slug: string;
  titleEn: string;
  titleBn: string;
  bodyEn?: string;
  bodyBn?: string;
  status?: CmsPageStatus;
  metaTitle?: string;
  metaDescription?: string;
}

export type UpdateCmsPageDto = Partial<CreateCmsPageDto>;

export interface CmsPageRevisionDto {
  id: string;
  pageId: string;
  revisionNumber: number;
  titleEn: string;
  titleBn: string;
  bodyEn: string | null;
  bodyBn: string | null;
  createdAt: string;
}

export interface CmsSectionDto {
  id: string;
  key: string;
  sectionType: string;
  titleEn: string | null;
  titleBn: string | null;
  position: number;
  config: Record<string, unknown> | null;
  isVisible: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCmsSectionDto {
  key: string;
  sectionType: string;
  titleEn?: string;
  titleBn?: string;
  position?: number;
  config?: Record<string, unknown>;
  isVisible?: boolean;
  startsAt?: string;
  endsAt?: string;
}

export type UpdateCmsSectionDto = Partial<CreateCmsSectionDto>;

export interface ReorderSectionsDto {
  orderedIds: string[];
}

export interface CmsMenuDto {
  id: string;
  location: CmsMenuLocation;
  name: string;
  items: CmsMenuItemDto[];
}

export interface CmsMenuItemDto {
  id: string;
  menuId: string;
  parentId: string | null;
  labelEn: string;
  labelBn: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
  children?: CmsMenuItemDto[];
}

export interface UpsertMenuItemDto {
  labelEn: string;
  labelBn: string;
  url: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface AnnouncementDto {
  id: string;
  textEn: string;
  textBn: string;
  bgColor: string;
  textColor: string;
  linkUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementDto {
  textEn: string;
  textBn: string;
  bgColor?: string;
  textColor?: string;
  linkUrl?: string;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
}

export type UpdateAnnouncementDto = Partial<CreateAnnouncementDto>;

export interface PopupDto {
  id: string;
  titleEn: string;
  titleBn: string;
  bodyEn: string | null;
  bodyBn: string | null;
  imageUrl: string | null;
  ctaLabelEn: string | null;
  ctaLabelBn: string | null;
  ctaUrl: string | null;
  dismissRule: Record<string, unknown> | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePopupDto {
  titleEn: string;
  titleBn: string;
  bodyEn?: string;
  bodyBn?: string;
  imageUrl?: string;
  ctaLabelEn?: string;
  ctaLabelBn?: string;
  ctaUrl?: string;
  dismissRule?: Record<string, unknown>;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
}

export type UpdatePopupDto = Partial<CreatePopupDto>;

export interface MediaLibraryItemDto {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  createdAt: string;
}

export interface CreateMediaItemDto {
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  altText?: string;
}

export interface ContactMessageDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  orderNo: string | null;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  replyBody: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactMessageDto {
  name: string;
  email: string;
  phone?: string;
  orderNo?: string;
  subject: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Home feed (C1)
// ---------------------------------------------------------------------------

export interface HomeFeedDto {
  announcements: AnnouncementDto[];
  sections: CmsSectionDto[];
  activeFlashSales: Array<{
    id: string;
    name: string;
    startsAt: string;
    endsAt: string;
    itemCount: number;
  }>;
  activePopups: PopupDto[];
}