import { useState } from 'react';
import { Alert } from 'react-native';
import type { CurrencyCode, LocaleCode } from '@shared/api-types';
import { usePreferences } from '@/api/hooks';
import { Screen } from '@/components/Screen';
import { Note, Row, SectionLabel } from '@/components/ui';
import { LOCALE_LABEL, setLocaleOverride } from '@/lib/i18n';
import { color } from '@/theme';

/**
 * 语言与货币。多语言多货币直接影响转化。
 *
 * 货币切换必须回服务端重新拿定价，不能在 App 里按汇率换算 ——
 * 换算出来的数字和实际扣款对不上，用户会认为被多收了钱，
 * 而且汇率浮动会让同一个套餐在两次打开时显示不同价格。
 * 所以这里改的是「请求头 X-Currency」，不是显示层的格式化。
 *
 * 语言名用各语言的自称（Español 而不是「西班牙语」）：
 * 用户来这一屏往往正因为看不懂当前语言，翻译过的语言名帮不上他。
 */
const LOCALES: { key: LocaleCode; flag: string }[] = [
  { key: 'zh', flag: '🇨🇳' },
  { key: 'en', flag: '🇬🇧' },
  { key: 'es', flag: '🇪🇸' },
  { key: 'ja', flag: '🇯🇵' },
];

const CURRENCIES: { key: CurrencyCode; symbol: string; label: string }[] = [
  { key: 'CNY', symbol: '¥', label: '人民币 CNY' },
  { key: 'USD', symbol: '$', label: '美元 USD' },
  { key: 'EUR', symbol: '€', label: '欧元 EUR' },
];

export default function PreferencesScreen() {
  const { data: prefs } = usePreferences();
  const [locale, setLocale] = useState<LocaleCode>(prefs?.locale ?? 'zh');
  const [currency, setCurrency] = useState<CurrencyCode>(prefs?.currency ?? 'CNY');

  const change = (fn: () => void, what: string) => {
    fn();
    Alert.alert(what, '骨架版本仅切换本地状态。接真实接口后会 PUT /preferences 并刷新定价。');
  };

  return (
    <Screen title="语言与货币" back>
      <SectionLabel first>显示语言</SectionLabel>
      {LOCALES.map((l) => (
        <Row
          key={l.key}
          icon={l.flag}
          label={LOCALE_LABEL[l.key]}
          value={locale === l.key ? '✓' : undefined}
          valueColor={color.ink}
          chevron={false}
          highlight={locale === l.key}
          onPress={() =>
            change(() => {
              setLocale(l.key);
              // 目录数据（目的地名、套餐规格）走 LocalizedText，
              // 改这个开关就够了，不用重拉接口
              setLocaleOverride(l.key);
            }, '显示语言')
          }
        />
      ))}

      <SectionLabel>结算货币</SectionLabel>
      {CURRENCIES.map((c) => (
        <Row
          key={c.key}
          icon={c.symbol}
          label={c.label}
          value={currency === c.key ? '✓' : undefined}
          valueColor={color.ink}
          chevron={false}
          highlight={currency === c.key}
          onPress={() => change(() => setCurrency(c.key), '结算货币')}
        />
      ))}

      <Note>定价由服务端按货币返回，App 不做汇率换算 —— 避免显示价和扣款价不一致。</Note>
    </Screen>
  );
}
