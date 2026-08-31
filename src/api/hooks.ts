import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  ActivationCredentials,
  CatalogFilter,
  CreateOrderResponse,
  Destination,
  Esim,
  InstallResultReport,
  Order,
  PlansResponse,
  Preferences,
  QuoteResponse,
  RefreshUsageResponse,
  ReferralInfo,
  TopupOptionsResponse,
  UsageResponse,
  User,
} from '@shared/api-types';
import { USE_MOCK, delay, idempotencyKey, mock, request } from './client';

/**
 * 数据层。缓存时长对应契约文档第 10 节。
 *
 * 关键一条：安装凭证必须永久缓存且离线可用 —— 用户落地后可能完全没网，
 * 这时需要能看到二维码。这是最容易漏、但漏了会挨骂的一条。
 */

export const keys = {
  destinations: (filter?: CatalogFilter) => ['destinations', filter ?? 'popular'] as const,
  plans: (slug: string) => ['plans', slug] as const,
  esims: () => ['esims'] as const,
  esim: (id: string) => ['esim', id] as const,
  usage: (id: string) => ['usage', id] as const,
  activation: (id: string) => ['activation', id] as const,
  topup: (id: string) => ['topup', id] as const,
  orders: () => ['orders'] as const,
  order: (id: string) => ['order', id] as const,
  me: () => ['me'] as const,
  prefs: () => ['prefs'] as const,
  referral: () => ['referral'] as const,
};

const MIN = 60 * 1000;

// ───────────────── 目录 ─────────────────

/**
 * Mock 侧按 filter 筛。真接口是服务端筛的，
 * 但 mock 也照着筛一遍，否则点「欧洲」还是出日本，
 * 骨架跑起来看着是对的、接上真接口才发现筛选没接线。
 */
function mockDestinationsFor(filter: CatalogFilter): Destination[] {
  if (filter === 'multi') return mock.mockRegions;
  if (filter === 'popular') return mock.mockDestinations.filter((d) => d.is_popular);
  const region = filter.slice('region:'.length);
  return mock.mockDestinations.filter((d) => d.region === region);
}

export function useDestinations(
  filter: CatalogFilter = 'popular',
): UseQueryResult<Destination[]> {
  return useQuery({
    queryKey: keys.destinations(filter),
    staleTime: 24 * 60 * MIN, // 变化极少
    queryFn: async () => {
      if (USE_MOCK) return delay(mockDestinationsFor(filter));
      const r = await request<{ data: Destination[] }>(
        `/api/v1/destinations?filter=${encodeURIComponent(filter)}`,
      );
      return r.data;
    },
  });
}

export function useRegions(): UseQueryResult<Destination[]> {
  return useQuery({
    queryKey: keys.destinations('multi'),
    staleTime: 24 * 60 * MIN,
    queryFn: async () => {
      if (USE_MOCK) return delay(mock.mockRegions);
      const r = await request<{ data: Destination[] }>('/api/v1/destinations?filter=multi');
      return r.data;
    },
  });
}

export function usePlans(slug: string): UseQueryResult<PlansResponse> {
  return useQuery({
    queryKey: keys.plans(slug),
    staleTime: 60 * MIN, // 价格可能调
    queryFn: async () => {
      if (USE_MOCK) return delay(mock.mockPlans);
      return request<PlansResponse>(`/api/v1/destinations/${slug}/plans`);
    },
  });
}

// ───────────────── eSIM ─────────────────

export function useEsims(): UseQueryResult<Esim[]> {
  return useQuery({
    queryKey: keys.esims(),
    staleTime: 2 * MIN, // 打开即刷新
    queryFn: async () => {
      if (USE_MOCK) return delay(mock.mockEsims);
      const r = await request<{ data: Esim[] }>('/api/v1/esims');
      return r.data;
    },
  });
}

export function useEsim(id: string): UseQueryResult<Esim | undefined> {
  const all = useEsims();
  return {
    ...all,
    data: all.data?.find((e) => e.id === id),
  } as UseQueryResult<Esim | undefined>;
}

export function useUsage(id: string): UseQueryResult<UsageResponse> {
  return useQuery({
    queryKey: keys.usage(id),
    staleTime: 5 * MIN,
    queryFn: async () => {
      if (USE_MOCK) return delay(mock.mockUsage);
      return request<UsageResponse>(`/api/v1/esims/${id}/usage?range=7d`);
    },
  });
}

/**
 * 安装凭证。staleTime/gcTime 设为 Infinity —— 用户落地后没网时必须能看到二维码。
 * 配合 AsyncStorage persister 做离线可用（见 providers.tsx）。
 */
export function useActivation(id: string): UseQueryResult<ActivationCredentials> {
  return useQuery({
    queryKey: keys.activation(id),
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async () => {
      if (USE_MOCK) return delay(mock.mockActivation);
      return request<ActivationCredentials>(`/api/v1/esims/${id}/activation`);
    },
  });
}

/** 下拉刷新余量。服务端做 60s 节流，throttled=true 时返回的是缓存 */
export function useRefreshUsage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<RefreshUsageResponse> => {
      if (USE_MOCK) {
        return delay(
          {
            data_used_mb: 3359,
            data_remaining_mb: 1761,
            usage_synced_at: new Date().toISOString(),
            throttled: false,
          },
          700,
        );
      }
      return request<RefreshUsageResponse>(`/api/v1/esims/${id}/refresh-usage`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.esims() });
      void qc.invalidateQueries({ queryKey: keys.usage(id) });
    },
  });
}

/** 上报安装结果。失败数据是优化安装引导的唯一依据 */
export function useReportInstall(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (report: InstallResultReport) => {
      if (USE_MOCK) return delay({ ok: true });
      return request(`/api/v1/esims/${id}/install-result`, {
        method: 'POST',
        body: report,
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.esims() }),
  });
}

// ───────────────── 加购 ─────────────────

export function useTopupOptions(id: string): UseQueryResult<TopupOptionsResponse> {
  return useQuery({
    queryKey: keys.topup(id),
    staleTime: 5 * MIN,
    queryFn: async () => {
      if (USE_MOCK) return delay(mock.mockTopup);
      return request<TopupOptionsResponse>(`/api/v1/esims/${id}/topup-options`);
    },
  });
}

export function useCreateTopup(id: string) {
  return useMutation({
    mutationFn: async (input: { data_option_id: string; validity_option_id?: string | null }) => {
      if (USE_MOCK) {
        return delay<CreateOrderResponse>({
          order: {
            id: 'ord_TOPUP01',
            order_no: 'VY-TOPUP01',
            status: 'pending_payment',
            total: 3600,
            currency: 'CNY',
            channel: 'app',
            is_guest: false,
            email: 'nicholas@example.com',
            created_at: new Date().toISOString(),
            items: [],
          },
          payment: {
            provider: 'stripe',
            checkout_url: 'https://pay.voyaesim.com/checkout/topup01',
            return_url: 'voyaesim://order/ord_TOPUP01/result',
          },
          order_token: 'mock.order.token',
        });
      }
      return request<CreateOrderResponse>(`/api/v1/esims/${id}/topup`, {
        method: 'POST',
        body: { ...input, payment_method: 'card' },
        idempotencyKey: idempotencyKey(),
      });
    },
  });
}

// ───────────────── 订单 ─────────────────

export function useQuote(planId: string, promoCode?: string): UseQueryResult<QuoteResponse> {
  return useQuery({
    queryKey: ['quote', planId, promoCode ?? ''],
    queryFn: async () => {
      if (USE_MOCK) return delay(mock.mockQuote, 300);
      return request<QuoteResponse>('/api/v1/orders/quote', {
        method: 'POST',
        body: {
          items: [{ plan_id: planId, quantity: 1 }],
          promo_code: promoCode ?? null,
          use_credit: false,
        },
      });
    },
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (input: { plan_id: string; promo_code?: string | null; email: string }) => {
      if (USE_MOCK) {
        return delay<CreateOrderResponse>({
          order: {
            id: 'ord_8H2K41',
            order_no: 'VY-8H2K41',
            status: 'pending_payment',
            total: 5220,
            currency: 'CNY',
            channel: 'app',
            is_guest: false,
            email: input.email,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
            items: [],
          },
          payment: {
            provider: 'stripe',
            checkout_url: 'https://pay.voyaesim.com/checkout/8h2k41',
            return_url: 'voyaesim://order/ord_8H2K41/result',
          },
          order_token: 'mock.order.token',
        });
      }
      return request<CreateOrderResponse>('/api/v1/orders', {
        method: 'POST',
        body: {
          items: [{ plan_id: input.plan_id, quantity: 1 }],
          promo_code: input.promo_code ?? null,
          use_credit: false,
          email: input.email,
          payment_method: 'card',
        },
        // 必带 —— 用户狂点支付按钮或请求超时重试都不会重复下单
        idempotencyKey: idempotencyKey(),
      });
    },
  });
}

export function useOrders(): UseQueryResult<Order[]> {
  return useQuery({
    queryKey: keys.orders(),
    staleTime: 10 * MIN,
    queryFn: async () => {
      if (USE_MOCK) return delay(mock.mockOrders);
      const r = await request<{ data: Order[] }>('/api/v1/orders?page=1&per_page=20');
      return r.data;
    },
  });
}

/**
 * 单个订单。支付回跳后用它轮询确认结果。
 * 回跳只是「用户走完了流程」的信号，不是支付成功的凭证 —— 真实状态以服务端为准。
 */
export function useOrder(id: string, poll = false): UseQueryResult<Order> {
  return useQuery({
    queryKey: keys.order(id),
    refetchInterval: poll ? 2000 : false,
    queryFn: async () => {
      if (USE_MOCK) {
        return delay({ ...mock.mockOrders[0]!, id, status: 'completed' as const });
      }
      return request<Order>(`/api/v1/orders/${id}`);
    },
  });
}

// ───────────────── 账户 ─────────────────

export function useMe(): UseQueryResult<User> {
  return useQuery({
    queryKey: keys.me(),
    staleTime: 10 * MIN,
    queryFn: async () => {
      if (USE_MOCK) return delay(mock.mockUser);
      return request<User>('/api/v1/me');
    },
  });
}

export function usePreferences(): UseQueryResult<Preferences> {
  return useQuery({
    queryKey: keys.prefs(),
    staleTime: Infinity,
    queryFn: async () => {
      if (USE_MOCK) return delay(mock.mockPreferences, 200);
      return request<Preferences>('/api/v1/preferences');
    },
  });
}

export function useReferral(): UseQueryResult<ReferralInfo> {
  return useQuery({
    queryKey: keys.referral(),
    staleTime: 10 * MIN,
    queryFn: async () => {
      if (USE_MOCK) return delay(mock.mockReferral);
      return request<ReferralInfo>('/api/v1/referral');
    },
  });
}
