import { api } from './client';
import type {
  Announcement,
  CmsMenu,
  CmsPage,
  CmsSection,
  HomeFeed,
} from './types';

function unwrap<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'value' in response) {
    return (response as { value: T }).value;
  }
  return response as T;
}

export interface SubmitContactInput {
  name: string;
  email: string;
  orderNumber?: string;
  subject: string;
  message: string;
}

export interface SubmitContactResponse {
  ok: boolean;
  ticketId?: string;
}

// Popup shape from backend /cms/popups/active
export interface ActivePopup {
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

export const cmsApi = {
  async getHomeFeed(): Promise<HomeFeed> {
    return api.get<HomeFeed>('/cms/home-feed');
  },

  async getVisibleSections(): Promise<CmsSection[]> {
    const res = await api.get<unknown>('/cms/sections/visible');
    return unwrap<CmsSection[]>(res);
  },

  async getPageBySlug(slug: string): Promise<CmsPage> {
    return api.get<CmsPage>(`/cms/pages/slug/${encodeURIComponent(slug)}`);
  },

  async getActiveAnnouncements(): Promise<Announcement[]> {
    const res = await api.get<unknown>('/cms/announcements/active');
    return unwrap<Announcement[]>(res);
  },

  async getMenu(location: 'HEADER' | 'FOOTER' | 'MOBILE'): Promise<CmsMenu> {
    const res = await api.get<unknown>(`/cms/menus/${location}`);
    return unwrap<CmsMenu>(res);
  },

  async submitContact(input: SubmitContactInput): Promise<SubmitContactResponse> {
    return api.post<SubmitContactResponse>('/cms/contact', input);
  },

  async getActivePopups(): Promise<ActivePopup[]> {
    const res = await api.get<unknown>('/cms/popups/active');
    return unwrap<ActivePopup[]>(res);
  },
};