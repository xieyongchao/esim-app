import { useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, focusManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { AppState, Platform } from 'react-native';
import { ApiError } from './client';

/**
 * 数据层容器。
 *
 * 用 PersistQueryClientProvider 而不是普通的 QueryClientProvider ——
 * 关键在于安装凭证（activation）必须离线可用：用户落地东京、还没连上网，
 * 这时打开 App 要能看到二维码和激活码。如果缓存只在内存里，
 * 冷启动就没了，用户就卡死在「无网络」页面上，而这恰好是最需要它的时刻。
 *
 * retry 逻辑区分 retryable：服务端已经在错误体里告诉我们能不能重试，
 * 对 promo_invalid 这类错误反复重试只是浪费用户流量。
 */
const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'voya.query-cache',
  throttleTime: 1000,
});

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (count, error) => {
          if (error instanceof ApiError) return error.retryable && count < 2;
          return count < 2;
        },
        refetchOnWindowFocus: true,
        // 移动网络不稳定，失败重连间隔拉开一点
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: {
        // 写操作一律不自动重试 —— 幂等键保证安全，但重试策略交给页面显式决定
        retry: false,
      },
    },
  });
}

/** RN 没有 window focus 事件，要手动把 AppState 接到 focusManager */
function useAppStateFocus() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (Platform.OS !== 'web') focusManager.setFocused(state === 'active');
    });
    return () => sub.remove();
  }, []);
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  useAppStateFocus();

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: Infinity,
        dehydrateOptions: {
          // 只持久化「离线也必须看得到」的数据：安装凭证、eSIM 列表、目录。
          // 报价、订单状态这类必须实时的东西不落盘，否则用户会看到过期价格。
          shouldDehydrateQuery: (q) => {
            const root = q.queryKey[0];
            return root === 'activation' || root === 'esims' || root === 'destinations';
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
