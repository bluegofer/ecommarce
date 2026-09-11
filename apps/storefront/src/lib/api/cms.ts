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
};