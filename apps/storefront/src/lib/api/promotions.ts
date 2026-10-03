import { api } from './client';
import type { FlashSale } from './types';

function unwrap<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'value' in response) {
    return (response as { value: T }).value;
  }
  return response as T;
}

export const promotionsApi = {
  async getActiveFlashSales(): Promise<FlashSale[]> {
    const res = await api.get<unknown>('/flash-sales/active');
    return unwrap<FlashSale[]>(res);
  },
};