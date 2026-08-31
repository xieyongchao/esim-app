import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { color } from '@/theme';
import { USE_MOCK, delay } from '@/api/client';
import type { PaymentIntent } from '@shared/api-types';

/**
 * 支付。这是「复用网站」这个决策落地的地方。
 *
 * 用 openAuthSessionAsync 而不是 WebView 组件，三个理由：
 * 1. 它起的是 SFSafariViewController / Chrome Custom Tabs，是系统浏览器进程。
 *    卡号永远不经过我们的 JS 上下文，PCI 合规范围就不会扩到 App 里来。
 * 2. 银行 3DS 会跳到银行自己的域名。WebView 里做域名跳转 + 回跳很容易断，
 *    系统浏览器天然支持。
 * 3. 它能监听自定义 scheme 回跳并自动关闭浏览器。用 WebView 得自己拦 URL。
 *
 * 换句话说，新增一种支付方式只改网站，App 一行不用动、不用发版。
 */

export type PaymentOutcome =
  | { kind: 'returned'; url: string }
  | { kind: 'dismissed' };

export async function openCheckout(payment: PaymentIntent): Promise<PaymentOutcome> {
  if (USE_MOCK) {
    // Mock 模式下不真的开浏览器，直接假装用户付完回来了
    await delay(null, 900);
    return { kind: 'returned', url: payment.return_url };
  }

  const result = await WebBrowser.openAuthSessionAsync(
    payment.checkout_url,
    payment.return_url,
    {
      // 让内嵌浏览器的工具栏与 App 视觉连续，用户不会觉得「被丢到别的地方了」
      toolbarColor: color.paper,
      controlsColor: color.ink,
      dismissButtonStyle: 'done',
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      showTitle: Platform.OS === 'android',
      enableBarCollapsing: false,
    },
  );

  if (result.type === 'success') return { kind: 'returned', url: result.url };
  return { kind: 'dismissed' };
}

/**
 * ⚠️ 回跳只代表「用户走完了支付流程」，不代表支付成功。
 * 真实状态必须回来轮询 GET /orders/{id}（见契约第 4 节）——
 * 用户完全可以在支付页手动改 URL 回跳，或者支付失败后被跳回来。
 * 信任回跳等于给自己开一个白送商品的后门。
 */
export function orderIdFromReturnUrl(url: string): string | null {
  const m = /order\/([^/?#]+)/.exec(url);
  return m?.[1] ?? null;
}
