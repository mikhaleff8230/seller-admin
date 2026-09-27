import { HttpClient } from '@/data/client/http-client';
import { useQuery } from 'react-query';

export type SellerDashboardPeriod = 7 | 30 | 90;

export interface SellerDashboardData {
  period: { days: number; from: string; to: string };
  shop: { id: number; name: string; slug: string } | null;
  shops: Array<{ id: number; name: string; slug: string }>;
  summary: {
    impressions: number;
    clicks: number;
    product_views: number;
    messages: number;
  };
  growth: Record<'impressions' | 'clicks' | 'product_views' | 'messages', number | null>;
  chart: Array<{
    date: string;
    impressions: number;
    clicks: number;
    product_views: number;
    messages: number;
  }>;
  advertising: {
    status: 'active' | 'low' | 'warning' | 'stopped' | 'ready' | 'unavailable';
    balance: number;
    total_deposited: number;
    total_spent: number;
    period_spent: number;
    bonus_total: number | null;
    bonus_spent: number | null;
    active_products: number;
    available: boolean;
  };
  today: {
    impressions: number;
    clicks: number;
    product_views: number;
    messages: number;
  };
  products_count: number;
  unread_messages: number;
  products: Array<{
    id: number;
    name: string;
    slug: string;
    image?: { thumbnail?: string; original?: string } | null;
    views: number;
    clicks: number;
    ctr: number;
    messages: number | null;
    status: 'good_interest' | 'stable' | 'improve_photo' | 'no_data';
  }>;
  recommendations: Array<{
    key: string;
    title: string;
    description: string;
  }>;
  onboarding: {
    completed: number;
    total: number;
    steps: Array<{ label: string; complete: boolean }>;
  };
}

export function useSellerDashboardQuery(
  shopId: number | string | undefined,
  period: SellerDashboardPeriod
) {
  return useQuery<SellerDashboardData, Error>(
    ['seller-dashboard', shopId, period],
    () =>
      HttpClient.get<SellerDashboardData>('/api/seller/dashboard', {
        shop_id: shopId,
        period,
      }),
    {
      enabled: Boolean(shopId),
      keepPreviousData: true,
      staleTime: 30_000,
      refetchInterval: 60_000,
    }
  );
}
