import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Esim } from '@shared/api-types';
import { color, font, radius, size, weight } from '@/theme';
import { dateLabel, remainingPercent } from '@/lib/format';
import { t } from '@/lib/i18n';
import { DataGauge } from './DataGauge';
import { StatusChip } from './StatusChip';

/**
 * 登机牌式 eSIM 卡片 —— 本 App 的签名元素。
 *
 * 形态取自登机牌：主体 + 齿孔撕裂线 + 票根。理由是 eSIM 本身就是「一张凭证」，
 * 这比再做一个圆角渐变卡片更贴题，也让「我的 eSIM」这一屏一眼就有辨识度。
 * 齿孔用绝对定位的两个半圆挖出来，颜色必须和页面底色一致才有镂空错觉。
 */
export function BoardingPass({
  esim,
  onPress,
}: {
  esim: Esim;
  onPress?: () => void;
}) {
  const dead = esim.status === 'expired' || esim.status === 'depleted';
  const pending = esim.status === 'ready' || esim.status === 'provisioning';
  const pct = remainingPercent(esim);

  const bg = dead ? '#EDEFF4' : pending ? color.ink2 : color.ink;
  const fg = dead ? color.inkMute : color.onInk;
  const subFg = dead ? color.inkMute : color.onInkSoft;

  // 票根右侧的行动号召随状态变化 —— 待安装引导安装，用完了引导加购
  const stubAction = pending ? '安装 ›' : dead ? '再买一张 ›' : '加购 ›';

  const stubInfo = pending
    ? '连网后开始计时'
    : dead
      ? `${dateLabel(esim.expires_at)}到期`
      : `剩 ${esim.days_remaining} 天 · ${dateLabel(esim.expires_at)}到期`;

  const usageLine = pending
    ? `未开始使用 / 共 ${esim.data_remaining_label}`
    : `剩余 / 共 ${esim.data_total_mb ? `${(esim.data_total_mb / 1024).toFixed(0)} GB` : '无限量'}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pass,
        { backgroundColor: bg, opacity: pressed ? 0.9 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${t(esim.destination.name)} eSIM，剩余 ${esim.data_remaining_label}`}
    >
      <View style={styles.main}>
        <View style={styles.head}>
          <Text style={styles.flag}>{esim.destination.flag_emoji}</Text>
          <View style={styles.where}>
            <Text style={[styles.country, { color: fg }]}>{t(esim.destination.name)}</Text>
            <Text style={[styles.op, { color: subFg }]}>
              {esim.network_name} · {pending ? '尚未激活' : esim.network_type}
            </Text>
          </View>
          <StatusChip status={esim.status} />
        </View>

        <View style={styles.gaugeWrap}>
          <DataGauge percent={pct} onInk={!dead} />
        </View>

        <View style={styles.num}>
          <Text style={[styles.big, { color: fg }]}>{esim.data_remaining_label}</Text>
          <Text style={[styles.of, { color: subFg }]}>{usageLine}</Text>
        </View>
      </View>

      {/* 齿孔撕裂线：两个半圆必须用页面底色才有镂空效果 */}
      <View style={styles.perfWrap}>
        <View
          style={[
            styles.notch,
            styles.notchLeft,
            { backgroundColor: color.paper },
          ]}
        />
        <View
          style={[
            styles.perfLine,
            { borderTopColor: dead ? 'rgba(0,0,0,0.13)' : 'rgba(255,255,255,0.22)' },
          ]}
        />
        <View
          style={[
            styles.notch,
            styles.notchRight,
            { backgroundColor: color.paper },
          ]}
        />
      </View>

      <View style={styles.stub}>
        <Text style={[styles.stubText, { color: subFg }]}>{stubInfo}</Text>
        <Text style={[styles.stubText, styles.stubAction, { color: fg }]}>
          {stubAction}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pass: {
    borderRadius: radius.xl,
    marginBottom: 12,
    overflow: 'hidden',
  },
  main: { paddingHorizontal: 17, paddingTop: 16, paddingBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 15 },
  flag: { fontSize: 26, lineHeight: 30 },
  where: { flex: 1, minWidth: 0 },
  country: {
    fontSize: size.h3,
    fontWeight: weight.bold,
    letterSpacing: -0.3,
  },
  op: {
    fontFamily: font.mono,
    fontSize: 10,
    marginTop: 2,
  },
  gaugeWrap: { marginBottom: 11 },
  num: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  big: {
    fontFamily: font.mono,
    fontSize: 23,
    fontWeight: weight.bold,
    letterSpacing: -0.6,
  },
  of: { fontFamily: font.mono, fontSize: 11 },

  perfWrap: {
    height: 1,
    marginHorizontal: 17,
    justifyContent: 'center',
    position: 'relative',
  },
  perfLine: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  notch: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: -8,
  },
  notchLeft: { left: -25 },
  notchRight: { right: -25 },

  stub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 17,
    paddingTop: 12,
    paddingBottom: 14,
  },
  stubText: { fontFamily: font.mono, fontSize: 10.5 },
  stubAction: { fontWeight: weight.semibold },
});
