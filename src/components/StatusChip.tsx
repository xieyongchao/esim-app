import { StyleSheet, Text, View } from 'react-native';
import type { EsimStatus } from '@shared/api-types';
import { color, font, radius } from '@/theme';

/**
 * eSIM 状态标签。
 *
 * ready 显示「待安装」而非「未使用」—— 前者告诉用户下一步做什么，后者只是描述状态。
 * installed 和 active 文案必须区分：装好了但没连过当地网络时说「已安装」，
 * 不能说「使用中」，否则用户会以为有效期已经开始扣了。
 */
const MAP: Record<EsimStatus, { label: string; bg: string; fg: string }> = {
  provisioning: { label: '开通中', bg: color.amberSoft, fg: color.amberDeep },
  ready: { label: '待安装', bg: color.amberSoft, fg: color.amberDeep },
  installed: { label: '已安装', bg: color.amberSoft, fg: color.amberDeep },
  active: { label: '使用中', bg: color.tealSoft, fg: color.tealText },
  depleted: { label: '流量用完', bg: color.alertSoft, fg: color.alertText },
  expired: { label: '已到期', bg: '#EDEFF4', fg: color.inkMute },
  suspended: { label: '已暂停', bg: color.alertSoft, fg: color.alertText },
};

export function StatusChip({ status }: { status: EsimStatus }) {
  const s = MAP[status];
  return (
    <View style={[styles.chip, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  text: {
    fontFamily: font.mono,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
