import { getLocales } from 'expo-localization';
import type { LocaleCode, LocalizedText } from '@shared/api-types';

/**
 * 多语言取值。
 *
 * 契约里目录类字段（目的地名、套餐规格）是 LocalizedText 对象而不是 string，
 * 这不是过度设计 —— 网站的语言切换是纯客户端零请求的，若服务端按
 * Accept-Language 返回单语言，用户每次点「EN / 中文」都要重拉整个目录。
 * App 复用同一套契约，代价就是渲染前必须过一次 t()。
 *
 * 把这个代价收在一个函数里，而不是让每个页面写 name.zh：
 * 写死 .zh 的话，将来加西语要改 40 处，且漏一处就是线上中文乱入。
 */

/**
 * LocalizedText 目前只有 en / zh 两个键。
 * 服务端加语言时这里跟着加，但 UI 语言（LocaleCode，含 es / ja）
 * 和目录语言不必同步 —— 目录缺某语言时回落到英文，
 * 比显示空字符串好得多。
 */
type CatalogLang = keyof LocalizedText;

const CATALOG_FALLBACK: CatalogLang = 'en';

function toCatalogLang(locale: LocaleCode): CatalogLang {
  return locale === 'zh' ? 'zh' : CATALOG_FALLBACK;
}

/** 系统语言 → 契约的 LocaleCode。识别不了的一律 en */
export function deviceLocale(): LocaleCode {
  const tag = getLocales()[0]?.languageCode ?? 'en';
  if (tag === 'zh') return 'zh';
  if (tag === 'es') return 'es';
  if (tag === 'ja') return 'ja';
  return 'en';
}

/**
 * 当前语言。
 *
 * 目前直接读系统语言。接入后端后应改为读 GET /me/preferences 的 locale，
 * 因为用户可能刻意选了与系统不同的语言（常见于用英文系统的中文用户），
 * 而那个选择存在服务端 —— 换设备也要保持一致。
 * 改动点只有这一个函数。
 */
let override: LocaleCode | null = null;

export function currentLocale(): LocaleCode {
  return override ?? deviceLocale();
}

export function setLocaleOverride(locale: LocaleCode | null): void {
  override = locale;
}

/** 取多语言文本。传 null / undefined 返回空串，让调用方不用到处判空 */
export function t(text: LocalizedText | null | undefined): string {
  if (!text) return '';
  const lang = toCatalogLang(currentLocale());
  return text[lang] || text[CATALOG_FALLBACK] || '';
}

/** 语言的自称，用于设置页列表。不翻译 —— 选语言时用户还看不懂当前语言 */
export const LOCALE_LABEL: Record<LocaleCode, string> = {
  zh: '简体中文',
  en: 'English',
  es: 'Español',
  ja: '日本語',
};
