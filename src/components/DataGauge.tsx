import { View, StyleSheet } from 'react-native';
import { color } from '@/theme';

/**
 * 分段流量计 —— 灵感来自机场航班翻牌板。
 *
 * 为什么不用渐变圆环进度条：那是每个 App 都在用的默认答案。分段格子和
 * 「流量按块消耗」的心理模型更贴，而且等宽的格子让两张卡的余量可以横向对比。
 * 空格保持 60% 高度而非归零，是为了让「轨道」始终可见，用户能看出总量。
 */
export function DataGauge({
  percent,
  segments = 26,
  height = 26,
  onInk = false,
}: {
  percent: number;
  segments?: number;
  height?: number;
  /** 深色背景上使用 */
  onInk?: boolean;
}) {
  const lit = Math.round((Math.max(0, Math.min(100, percent)) / 100) * segments);

  // 余量少于 15% 转红，多于 60% 用青色，中间用琥珀 —— 颜色本身传递紧迫感
  const litColor =
    percent <= 15 ? color.alert : percent >= 60 ? color.teal : color.amber;

  const emptyColor = onInk ? color.onInkFaint : 'rgba(0,0,0,0.07)';

  return (
    <View style={[styles.row, { height }]}>
      {Array.from({ length: segments }, (_, i) => (
        <View
          key={i}
          style={[
            styles.seg,
            i < lit
              ? { backgroundColor: litColor, height: '100%' }
              : { backgroundColor: emptyColor, height: '60%' },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2.5,
  },
  seg: {
    flex: 1,
    borderRadius: 1.5,
  },
});
