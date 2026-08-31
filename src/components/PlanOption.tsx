import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, radius, size, weight } from '@/theme';
import { money } from '@/lib/format';
import type { CurrencyCode, MinorAmount } from '@shared/api-types';

/**
 * 套餐选择器。
 *
 * 三条刻意的设计决定：
 * 1. 单价（¥11.6/GB）必须显示 —— 用户判断「哪个划算」靠的是单价，不是总价。
 *    不给单价，用户就得自己心算，多数人会直接选最便宜那个，客单价上不去。
 * 2. 徽标（最多人选 / 最划算）由服务端 badge 字段决定，不在 App 里硬编码，
 *    运营调整推荐位不用发版。
 * 3. 选中态用 1.5px 深色描边 + 实心圆点，不用背景色填充 ——
 *    填充色会盖掉价格文字的对比度。
 */

const BADGE_TEXT = {
  most_popular: '最多人选',
  best_value: '最划算',
} as const;

export function PlanOption({
  dataLabel,
  validityLabel,
  price,
  currency = 'CNY',
  unitPriceLabel,
  badge,
  selected,
  onPress,
}: {
  dataLabel: string;
  validityLabel: string;
  price: MinorAmount;
  currency?: CurrencyCode;
  unitPriceLabel?: string;
  badge?: 'most_popular' | 'best_value' | 'covers_trip' | null;
  selected?: boolean;
  onPress?: () => void;
}) {
  const badgeText =
    badge === 'covers_trip' ? '够用到回程' : badge ? BADGE_TEXT[badge] : null;

  return (
    <View style={styles.wrap}>
      {badgeText ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      ) : null}
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected: !!selected }}
        style={({ pressed }) => [
          styles.plan,
          selected && styles.planOn,
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
        <View style={styles.body}>
          <Text style={styles.data}>{dataLabel}</Text>
          <Text style={styles.days}>{validityLabel}</Text>
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.price}>{money(price, currency)}</Text>
          {unitPriceLabel ? <Text style={styles.unit}>{unitPriceLabel}</Text> : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', marginBottom: 9 },

  badge: {
    position: 'absolute',
    top: -7,
    right: 13,
    zIndex: 2,
    backgroundColor: color.amber,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  badgeText: {
    fontFamily: font.mono,
    fontSize: 9,
    fontWeight: weight.bold,
    color: color.onAmber,
    letterSpacing: 0.3,
  },

  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 13,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  planOn: { borderColor: color.ink, borderWidth: 1.5 },

  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: color.ink },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: color.ink,
  },

  body: { flex: 1, minWidth: 0 },
  data: {
    fontSize: size.h3,
    fontWeight: weight.bold,
    color: color.ink,
    letterSpacing: -0.4,
  },
  days: { fontSize: size.label, color: color.inkMute, marginTop: 2 },

  priceCol: { alignItems: 'flex-end' },
  price: {
    fontFamily: font.mono,
    fontSize: 15.5,
    fontWeight: weight.bold,
    color: color.ink,
    letterSpacing: -0.4,
  },
  /** 单价 —— 用户判断划算与否的真正依据 */
  unit: {
    fontFamily: font.mono,
    fontSize: 9.5,
    color: color.inkMute,
    marginTop: 3,
  },
});
