import { StyleSheet, Text, View } from 'react-native';
import type { UsagePoint } from '@shared/api-types';
import { color, font, weight } from '@/theme';

/**
 * 近 7 天用量柱状图。
 *
 * 刻意不用图表库：7 根柱子用 View 画出来只有几十行，而任何图表库
 * (victory-native / react-native-chart-kit) 都会带来体积和手势冲突。
 * 最高那根用琥珀色高亮 —— 让用户一眼看到「哪天用得最猛」，
 * 这个认知直接指向加购。
 */
export function UsageBars({
  points,
  height = 88,
  onInk = true,
}: {
  points: UsagePoint[];
  height?: number;
  /** 深色背景上使用（流量详情页是深色底） */
  onInk?: boolean;
}) {
  const max = Math.max(...points.map((p) => p.used_mb), 1);
  const trackColor = onInk ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const barColor = onInk ? 'rgba(255,255,255,0.34)' : color.inkMute;
  const labelColor = onInk ? 'rgba(255,255,255,0.38)' : color.inkMute;

  return (
    <View>
      <View style={[styles.bars, { height }]}>
        {points.map((p) => {
          const peak = p.used_mb === max;
          return (
            <View key={p.date} style={[styles.slot, { backgroundColor: trackColor }]}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(3, (p.used_mb / max) * 100)}%`,
                    backgroundColor: peak ? color.amber : barColor,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.axis}>
        {points.map((p) => (
          <Text key={p.date} style={[styles.axisText, { color: labelColor }]}>
            {Number(p.date.slice(8, 10))}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  slot: {
    flex: 1,
    height: '100%',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: { width: '100%', borderRadius: 4 },
  axis: { flexDirection: 'row', gap: 6, marginTop: 6 },
  axisText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: font.mono,
    fontSize: 9,
    fontWeight: weight.medium,
  },
});
