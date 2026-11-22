import { HttpClient } from '@/data/client/http-client';

export type TelegramChannel = {
  id: number;
  shop_id: number;
  title: string;
  username?: string;
  url?: string;
  supplier_name?: string;
  status: string;
  auto_import_enabled: boolean;
  markup_percent: string | number;
  price_source: 'wholesale' | 'retail';
  posts_count?: number;
  products_count?: number;
  last_publication_at?: string;
  last_sync_at?: string;
  last_error?: string;
};

export type TelegramPost = {
  id: number;
  channel_id: number;
  telegram_message_id: number;
  source_url?: string;
  original_text?: string;
  normalized_data?: any;
  original_date?: string;
  status: string;
  product_id?: number;
  error_message?: string;
  channel?: TelegramChannel;
  media?: Array<{ storage_data?: { thumbnail?: string; original?: string } }>;
  product?: {
    id: number;
    full_slug?: string;
    slug?: string;
    shop?: { slug?: string };
  };
};

export const telegramImportClient = {
  stats: () => HttpClient.get<any>('/telegram-import/stats'),
  channels: () =>
    HttpClient.get<any>('/telegram-import/channels', { limit: 100 }),
  posts: (params: Record<string, unknown> = {}) =>
    HttpClient.get<any>('/telegram-import/posts', { limit: 50, ...params }),
  createChannel: (data: unknown) =>
    HttpClient.post<TelegramChannel>('/telegram-import/channels', data),
  updateChannel: (id: number, data: unknown) =>
    HttpClient.patch<TelegramChannel>(`/telegram-import/channels/${id}`, data),
  sync: (id: number) =>
    HttpClient.post(`/telegram-import/channels/${id}/sync`, {}),
  pause: (id: number) =>
    HttpClient.post(`/telegram-import/channels/${id}/pause`, {}),
  remove: (id: number) => HttpClient.delete(`/telegram-import/channels/${id}`),
  retry: (id: number) =>
    HttpClient.post(`/telegram-import/posts/${id}/retry`, {}),
  bulk: (data: unknown) => HttpClient.post('/telegram-import/posts/bulk', data),
};
