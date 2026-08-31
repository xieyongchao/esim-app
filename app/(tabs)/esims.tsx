import { useCallback } from 'react';
import { Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { Esim } from '@shared/api-types';
import { keys, useEsims } from '@/api/hooks';
import { Screen, PageTitle } from '@/components/Screen';
import { BoardingPass } from '@/components/BoardingPass';
import { EmptyState, SectionLabel } from '@/components/ui';
import { relativeTime } from '@/lib/format';
import { color, font, size } from '@/theme';

/**
 * 我的 eSIM —— 这一屏是用户装 App 的真正理由。
 *
 * 分组顺序是「正在使用 → 待安装 → 已结束」，不是按购买时间倒序。
 * 理由：用户打开这屏 90% 是想看「我还剩多少流量」，那张卡必须在最上面，
 * 不能让它被一堆过期卡挤下去。
 *
 * 下拉刷新余量。「几分钟前更新」必须显示 —— 上游余量接口有分钟级延迟，
 * 不说清楚用户会反复下拉，然后投诉数据不准。
 */
export default function EsimsScreen() {
  const qc = useQueryClient();
  const { data: esims, isLoading, isRefetching } = useEsims();

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: keys.esims() });
  }, [qc]);

  const live = (esims ?? []).filter(
    (e) => e.status === 'active' || e.status === 'installed',
  );
  const pending = (esims ?? []).filter(
    (e) => e.status === 'ready' || e.status === 'provisioning',
  );
  const done = (esims ?? []).filter(
    (e) => e.status === 'expired' || e.status === 'depleted' || e.status === 'suspended',
  );

  if (!isLoading && (esims ?? []).length === 0) {
    return (
      <Screen center>
        <EmptyState
          icon="🎫"
          title="还没有 eSIM"
          detail={'买一张就能在国外直接上网，\n不用找店买卡，也不用换卡针。'}
          action={{ label: '看看去哪些国家能用', onPress: () => router.push('/') }}
        />
      </Screen>
    );
  }

  const syncedAt = esims?.[0]?.usage_synced_at;

  return (
    <Screen onRefresh={refresh} refreshing={isRefetching}>
      <PageTitle title="我的 eSIM" subtitle="下拉刷新余量。快用完或快到期时会推送提醒你。" />

      {syncedAt ? <Text style={styles.synced}>{relativeTime(syncedAt)}</Text> : null}

      {live.length > 0 ? (
        <>
          <SectionLabel first>正在使用</SectionLabel>
          {live.map((e) => (
            <Pass key={e.id} esim={e} />
          ))}
        </>
      ) : null}

      {pending.length > 0 ? (
        <>
          <SectionLabel first={live.length === 0}>待安装</SectionLabel>
          {pending.map((e) => (
            <Pass key={e.id} esim={e} />
          ))}
        </>
      ) : null}

      {done.length > 0 ? (
        <>
          <SectionLabel>已结束</SectionLabel>
          {done.map((e) => (
            <Pass key={e.id} esim={e} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

/** 待安装的卡直接跳安装引导，其余跳详情 —— 让卡片的下一步动作和票根文案一致 */
function Pass({ esim }: { esim: Esim }) {
  const target =
    esim.status === 'ready' || esim.status === 'provisioning'
      ? (`/esim/${esim.id}/install` as const)
      : (`/esim/${esim.id}` as const);
  return <BoardingPass esim={esim} onPress={() => router.push(target)} />;
}

const styles = StyleSheet.create({
  synced: {
    fontFamily: font.mono,
    fontSize: size.micro,
    color: color.inkMute,
    marginTop: 10,
  },
});
