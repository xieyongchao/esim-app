import type { CurrencyCode, MinorAmount } from '@shared/api-types';

const SYMBOL: Record<CurrencyCode, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
};

/**
 * 金额格式化。服务端传最小货币单位整数，这里只负责显示。
 * 不做汇率换算 —— 那是服务端的事（契约第 0 节铁律二）。
 */
export function money(amount: MinorAmount, currency: CurrencyCode = 'CNY'): string {
  const v = (amount / 100).toFixed(2).replace(/\.00$/, '');
  return `${SYMBOL[currency]}${v}`;
}

/** 流量格式化。服务端一般会给 data_label，这个用于本地计算的场景 */
export function dataSize(mb: number | null): string {
  if (mb === null) return '无限量';
  if (mb < 1024) return `${Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(2).replace(/\.?0+$/, '')} GB`;
}

/**
 * 相对时间。用于显示 usage_synced_at ——
 * 让用户知道余量不是实时的，避免反复下拉刷新还投诉数据不准。
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚更新';
  if (min < 60) return `${min} 分钟前更新`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前更新`;
  return `${Math.floor(hr / 24)} 天前更新`;
}

/** 按设备本地时区渲染到期时间 */
export function dateLabel(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function dateTimeLabel(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dateLabel(iso)} ${hh}:${mm}`;
}

/** ICCID 分组显示，等宽字体下更易读也更容易人工核对 */
export function formatIccid(iccid: string): string {
  return iccid.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

/** 剩余流量百分比，用于分段流量计。无限量返回 100 */
export function remainingPercent(esim: {
  data_total_mb: number | null;
  data_remaining_mb: number | null;
  is_unlimited: boolean;
}): number {
  if (esim.is_unlimited) return 100;
  if (!esim.data_total_mb || esim.data_remaining_mb === null) return 0;
  return Math.max(0, Math.min(100, (esim.data_remaining_mb / esim.data_total_mb) * 100));
}
