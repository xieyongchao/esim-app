import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import type { ApiErrorBody, ApiErrorCode } from '@shared/api-types';
import * as mock from './mock-data';

const BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'https://api.voyaesim.com';

/**
 * Mock 开关。EAS build profile 里通过 EXPO_PUBLIC_USE_MOCK 控制：
 * development=1，preview/production=0。
 * 关掉它页面代码一行不用改 —— 这是把 mock 放在 client 层而不是页面层的原因。
 */
export const USE_MOCK =
  process.env.EXPO_PUBLIC_USE_MOCK === '1' ||
  (Constants.expoConfig?.extra?.useMockData as boolean) === true;

const TOKEN_KEY = 'voya.access_token';

export class ApiError extends Error {
  code: ApiErrorCode;
  retryable: boolean;
  field: string | null;

  constructor(body: ApiErrorBody['error']) {
    // message 由服务端本地化好，可直接显示给用户 —— App 不该自己拼错误文案，
    // 否则每加一个错误码就要发一次版本
    super(body.message);
    this.code = body.code;
    this.retryable = body.retryable;
    this.field = body.field;
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** 写操作必带，防止移动网络下重试造成重复下单重复扣款 */
  idempotencyKey?: string;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': 'zh-CN',
    'X-Currency': 'CNY',
    ...(await authHeader()),
  };
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError({
      code: 'network_error',
      message: '网络连不上，检查一下连接再试',
      field: null,
      retryable: true,
    });
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    if (body?.error) throw new ApiError(body.error);
    throw new ApiError({
      code: 'network_error',
      message: '出了点问题，稍后再试',
      field: null,
      retryable: true,
    });
  }

  return res.json() as Promise<T>;
}

/** 生成幂等键。写操作必用 */
export function idempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Mock 模式下模拟网络延迟，让加载态在开发时真实可见 */
export function delay<T>(value: T, ms = 420): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export { mock };
