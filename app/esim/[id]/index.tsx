import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEsim, useActivation, useRefreshUsage, useUsage } from '@/api/hooks';
import { Screen } from '@/components/Screen';
import { Button, Row, SectionLabel } from '@/components/ui';
import { DataGauge } from '@/components/DataGauge';
import { StatusChip } from '@/components/StatusChip';
import { UsageBars } from '@/components/UsageBars';
import { dataSize, dateLabel, dateTimeLabel, formatIccid, relativeTime, remainingPercent } from '@/lib/format';
import { t } from '@/lib/i18n';
import { color, font, size, weight } from '@/theme';

/**
 * 流量详情。深色底 —— 这一屏是「仪表盘」，深色让流量计和数字更突出，
 * 也和其余浅色页面形成层级差，用户能感知到「进到卡的内部了」。
 *
 * 余量数字来自上游供应商接口，缓存 + 下拉强制刷新，避免频繁打上游。
 * 「几分钟前更新」和「按这个用法约 X 天后用完」是这屏的两个关键信息：
 * 前者管预期，后者管转化。
 */
export default function EsimDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: esim } = useEsim(id ?? '');
  const { data: usage } = useUsage(id ?? '');
  // ICCID 属于安装凭证，不在 Esim 上 —— 它和激活码一样是敏感的卡标识，
  // 列表接口不该返回。这个 query 已永久缓存，所以离线也拿得到
  const { data: activation } = useActivation(id ?? '');
  const refresh = useRefreshUsage(id ?? '');

  const onRefresh = useCallback(() => {
    refresh.mutate();
  }, [refresh]);

  if (!esim) {
    return (
      <Screen title="加载中" back onInk scroll={false} center>
        <ActivityIndicator color={color.onInkSoft} />
      </Screen>
    );
  }

  const pct = remainingPercent(esim);
  const usedPct = Math.round(100 - pct);
  const canTopup = esim.supports_topup && esim.status !== 'expired';

  return (
    <Screen
      title={`${esim.destination.flag_emoji} ${t(esim.destination.name)}`}
      back
      onInk
      onRefresh={onRefresh}
      refreshing={refresh.isPending}
      navRight={
        <Pressable hitSlop={12} onPress={() => router.push('/help')}>
          <Text style={styles.navAct}>···</Text>
        </Pressable>
      }
      cta={
        canTopup ? (
          <Button
            variant="amber"
            label="加购流量"
            onPress={() => router.push(`/esim/${esim.id}/topup`)}
          />
        ) : (
          <Button
            label="再买一张"
            onPress={() => router.push(`/destination/${esim.destination.slug}`)}
          />
        )
      }
    >
      <View style={styles.hero}>
        <Text style={styles.big}>
          {esim.is_unlimited ? '∞' : (esim.data_remaining_mb ?? 0) / 1024 >= 1
            ? ((esim.data_remaining_mb ?? 0) / 1024).toFixed(2)
            : String(esim.data_remaining_mb ?? 0)}
        </Text>
        <Text style={styles.bigUnit}>
          {esim.is_unlimited
            ? '无限量'
            : `GB 剩余 · 共 ${dataSize(esim.data_total_mb)}`}
        </Text>
        <View style={styles.gaugeWrap}>
          <DataGauge percent={pct} height={32} onInk />
        </View>
        <View style={styles.gaugeMeta}>
          <Text style={styles.metaText}>已用 {dataSize(esim.data_used_mb)}</Text>
          <Text style={styles.metaText}>{usedPct}%</Text>
        </View>
        <Text style={styles.synced}>{relativeTime(esim.usage_synced_at)}</Text>
      </View>

      <SectionLabel onInk>有效期</SectionLabel>
      <View style={styles.panel}>
        <View style={styles.validRow}>
          <View>
            <Text style={styles.validBig}>
              {esim.days_remaining === null ? '尚未开始' : `${esim.days_remaining} 天`}
            </Text>
            <Text style={styles.validSub}>
              {esim.expires_at
                ? `${dateTimeLabel(esim.expires_at)} 到期`
                : '首次连上当地网络后开始计时'}
            </Text>
          </View>
          <StatusChip status={esim.status} />
        </View>
      </View>

      {usage ? (
        <>
          <SectionLabel onInk>近 7 天用量</SectionLabel>
          <UsageBars points={usage.points} />
          <Text style={styles.projection}>
            日均 {usage.daily_average_mb} MB
            {usage.projected_depletion_date
              ? ` · 按这个用法约 `
              : ''}
            {usage.projected_depletion_date ? (
              <Text style={styles.projectionHot}>
                {dateLabel(usage.projected_depletion_date)}
              </Text>
            ) : null}
            {usage.projected_depletion_date ? '用完' : ''}
            {usage.depletes_before_expiry ? '，早于到期日' : ''}
          </Text>
        </>
      ) : null}

      <SectionLabel onInk>卡片信息</SectionLabel>
      <View style={styles.panelTight}>
        <InkKV label="运营商" value={`${esim.network_name} · ${esim.network_type}`} />
        {activation ? <InkKV label="ICCID" value={formatIccid(activation.iccid)} mono /> : null}
        <InkKV
          label="激活时间"
          value={esim.activated_at ? dateLabel(esim.activated_at) : '尚未激活'}
        />
        <InkKV label="订单号" value={esim.order_no} last />
      </View>

      <SectionLabel onInk>遇到问题？</SectionLabel>
      <Row
        icon="🛠️"
        label="连不上网"
        detail="按步骤自查，一般两分钟能解决"
        onPress={() => router.push('/help')}
      />

      <SectionLabel onInk>安装凭证</SectionLabel>
      <Row
        icon="📋"
        label="二维码 / 手动安装信息"
        detail="离线也能打开 —— 落地没网时用这个"
        onPress={() => router.push(`/esim/${esim.id}/manual`)}
      />
    </Screen>
  );
}

function InkKV({
  label,
  value,
  last,
  mono,
}: {
  label: string;
  value: string;
  last?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={[styles.ikv, last && styles.ikvLast]}>
      <Text style={styles.ikvLabel}>{label}</Text>
      <Text style={[styles.ikvValue, mono && styles.ikvValueMono]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  navAct: { fontSize: 17, color: color.onInk, letterSpacing: 1 },

  hero: { alignItems: 'center', paddingTop: 14, paddingBottom: 6 },
  big: {
    fontFamily: font.mono,
    fontSize: size.display,
    fontWeight: weight.bold,
    color: color.onInk,
    letterSpacing: -1.8,
    lineHeight: 48,
  },
  bigUnit: {
    fontFamily: font.mono,
    fontSize: size.label,
    color: color.onInkSoft,
    marginTop: 5,
    letterSpacing: 0.5,
  },
  gaugeWrap: { alignSelf: 'stretch', marginTop: 20 },
  gaugeMeta: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  metaText: {
    fontFamily: font.mono,
    fontSize: size.micro,
    color: 'rgba(255,255,255,0.38)',
  },
  synced: {
    fontFamily: font.mono,
    fontSize: size.micro,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 12,
  },

  panel: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 15,
  },
  panelTight: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 3,
  },
  validRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  validBig: {
    fontFamily: font.mono,
    fontSize: size.h2,
    fontWeight: weight.bold,
    color: color.onInk,
  },
  validSub: { fontSize: size.label, color: color.onInkSoft, marginTop: 3 },

  projection: {
    fontFamily: font.mono,
    fontSize: size.caption,
    color: 'rgba(255,255,255,0.42)',
    marginTop: 11,
    lineHeight: 17,
  },
  projectionHot: { color: color.amber, fontWeight: weight.bold },

  ikv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  ikvLast: { borderBottomWidth: 0 },
  ikvLabel: { fontSize: size.bodySm, color: 'rgba(255,255,255,0.55)' },
  ikvValue: {
    flexShrink: 1,
    fontFamily: font.mono,
    fontSize: size.bodySm,
    fontWeight: weight.semibold,
    color: color.onInk,
    textAlign: 'right',
  },
  ikvValueMono: { fontSize: 11 },
});
