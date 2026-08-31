import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { usePlans } from '@/api/hooks';
import { Screen } from '@/components/Screen';
import { Button, Card, KV, Note, SectionLabel } from '@/components/ui';
import { PlanOption } from '@/components/PlanOption';
import { t } from '@/lib/i18n';
import { color, size } from '@/theme';

/**
 * 目的地详情。套餐与价格来自网站同一套目录接口，不再单独维护一份。
 *
 * 「生效时间」这一行由服务端 activation_policy 决定，不在 App 里写死：
 * 这是 eSIM 客服工单最集中的争议点，不同上游供应商策略不一样，
 * 写死在客户端意味着换供应商就要发版，而且发版期间用户看到的是错的。
 */
export default function DestinationScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, isLoading } = usePlans(slug ?? 'japan');
  const [picked, setPicked] = useState<string | null>(null);

  // 默认选中运营推荐的那个（badge=most_popular），没有就选第二个 ——
  // 默认选最便宜的会把客单价压死，默认不选会让用户多点一次
  useEffect(() => {
    if (picked || !data?.plans.length) return;
    const popular = data.plans.find((p) => p.badge === 'most_popular');
    setPicked(popular?.id ?? data.plans[Math.min(1, data.plans.length - 1)]?.id ?? null);
  }, [data, picked]);

  if (isLoading || !data) {
    return (
      <Screen title="加载中" back scroll={false} center>
        <ActivityIndicator color={color.inkMute} />
      </Screen>
    );
  }

  const d = data.destination;
  const plan = data.plans.find((p) => p.id === picked);

  const activationText =
    d.activation_policy === 'first_connection' ? '落地连网即启用' : '购买后立即计时';

  return (
    <Screen
      title={`${d.flag_emoji} ${t(d.name)}`}
      back
      cta={
        <Button
          label={plan ? '选好了，去结账' : '请选择套餐'}
          disabled={!plan}
          onPress={() => router.push(`/checkout?plan=${plan!.id}&slug=${d.slug}`)}
        />
      }
    >
      <Card style={styles.info}>
        <KV label="网络" value={d.networks.join(' / ')} />
        <KV label="网速" value={d.speed} />
        <KV label="热点共享" value={d.supports_hotspot ? '支持' : '不支持'} />
        <KV label="生效时间" value={activationText} last />
      </Card>

      {d.coverage_note ? <Text style={styles.coverage}>{t(d.coverage_note)}</Text> : null}

      <SectionLabel>选择流量套餐</SectionLabel>
      {data.plans.map((p) => (
        <PlanOption
          key={p.id}
          dataLabel={t(p.data_label)}
          validityLabel={
            p.daily_cap_note
              ? `${p.validity_days} 天有效 · ${t(p.daily_cap_note)}`
              : `${p.validity_days} 天有效`
          }
          price={p.price}
          currency={p.currency}
          unitPriceLabel={t(p.unit_price_label) || undefined}
          badge={p.badge}
          selected={p.id === picked}
          onPress={() => setPicked(p.id)}
        />
      ))}

      <SectionLabel>购买前请确认</SectionLabel>
      <Note>
        你的手机需要支持 eSIM 且未被运营商锁定。iPhone XS 及更新机型均支持。
      </Note>
      <View style={styles.tail} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  info: { marginTop: 10, paddingVertical: 4 },
  coverage: {
    fontSize: size.label,
    color: color.inkMute,
    marginTop: 9,
    lineHeight: 17,
  },
  tail: { height: 8 },
});
