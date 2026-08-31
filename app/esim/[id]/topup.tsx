import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCreateTopup, useTopupOptions } from '@/api/hooks';
import { Screen } from '@/components/Screen';
import { Button, Card, Row, SectionLabel } from '@/components/ui';
import { PlanOption } from '@/components/PlanOption';
import { dateLabel, money } from '@/lib/format';
import { t } from '@/lib/i18n';
import { openCheckout, orderIdFromReturnUrl } from '@/lib/payment';
import { color, font, size, weight } from '@/theme';

/**
 * 加购流量。App 最高价值的复购入口 —— 用户在旅途中最可能付钱的时刻。
 *
 * 顶部那张琥珀条卡片是整屏的转化引擎：它把「你还剩 1.72 GB」
 * 翻译成「按最近用量约 4 天后用完，但有效期还有 6 天」。
 * 前者是数据，后者是问题；用户只对问题掏钱。
 * 这个推算靠服务端 projected_depletion_date，不在 App 里算 ——
 * 服务端有完整的历史用量，算得比客户端准。
 *
 * 「加购后到期时间不变」必须写清楚，否则用户以为加流量就延期，
 * 到期后会来投诉。延期是单独的付费项。
 */
export default function TopupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useTopupOptions(id ?? '');
  const createTopup = useCreateTopup(id ?? '');
  const [picked, setPicked] = useState<string | null>(null);
  const [extend, setExtend] = useState(false);
  const [paying, setPaying] = useState(false);

  // 默认选中服务端标了 covers_trip 的那个 —— 「够用到回程」是最贴用户目标的选项
  useEffect(() => {
    if (picked || !data?.data_options.length) return;
    const best = data.data_options.find((o) => o.badge === 'covers_trip');
    setPicked(best?.id ?? data.data_options[0]?.id ?? null);
  }, [data, picked]);

  const option = data?.data_options.find((o) => o.id === picked);
  const validity = data?.validity_options[0];
  const total = (option?.price ?? 0) + (extend && validity ? validity.price : 0);

  const pay = async () => {
    if (!option) return;
    setPaying(true);
    try {
      const res = await createTopup.mutateAsync({
        data_option_id: option.id,
        validity_option_id: extend && validity ? validity.id : null,
      });
      const outcome = await openCheckout(res.payment);
      if (outcome.kind === 'dismissed') {
        setPaying(false);
        return;
      }
      const orderId = orderIdFromReturnUrl(outcome.url) ?? res.order.id;
      router.replace(`/order/${orderId}/result`);
    } catch (e) {
      Alert.alert('加购失败', e instanceof Error ? e.message : '稍后再试');
    } finally {
      setPaying(false);
    }
  };

  if (isLoading || !data) {
    return (
      <Screen title="加购流量" back scroll={false} center>
        <ActivityIndicator color={color.inkMute} />
      </Screen>
    );
  }

  const c = data.current;

  return (
    <Screen
      title="加购流量"
      back
      cta={
        <Button
          variant="amber"
          label={
            option
              ? `支付 ${money(total, option.currency)} · 加购 ${option.data_label}`
              : '请选择加购量'
          }
          disabled={!option}
          loading={paying}
          onPress={() => void pay()}
        />
      }
    >
      <Text style={styles.lead}>直接加到当前这张 eSIM 上，不用重新安装。</Text>

      <Card accent style={styles.hint}>
        <Text style={styles.hintText}>
          你还剩 <Text style={styles.mono}>{c.data_remaining_label}</Text>
          {c.projected_depletion_date ? (
            <>
              ，按最近用量约{' '}
              <Text style={styles.strong}>{dateLabel(c.projected_depletion_date)}</Text>
              用完。
            </>
          ) : (
            '。'
          )}
          {c.days_remaining !== null
            ? ` 有效期还有 ${c.days_remaining} 天，加购后到期时间不变。`
            : ''}
        </Text>
      </Card>

      <SectionLabel first>选择加购量</SectionLabel>
      {data.data_options.map((o) => (
        <PlanOption
          key={o.id}
          dataLabel={t(o.data_label)}
          validityLabel={o.estimated_days_label}
          price={o.price}
          currency={o.currency}
          badge={o.badge}
          selected={o.id === picked}
          onPress={() => setPicked(o.id)}
        />
      ))}

      {validity ? (
        <>
          <SectionLabel>同时延长有效期</SectionLabel>
          <Row
            icon="📅"
            label={validity.label}
            detail={`到期日推到 ${dateLabel(validity.new_expires_at)}`}
            value={extend ? `已加 +${money(validity.price)}` : `+${money(validity.price)}`}
            valueColor={extend ? color.teal : undefined}
            highlight={extend}
            onPress={() => setExtend((v) => !v)}
          />
        </>
      ) : null}

      {data.auto_topup.available ? (
        <>
          <SectionLabel>自动加购</SectionLabel>
          <Row
            icon="🔁"
            label={`剩 ${data.auto_topup.trigger_threshold_mb} MB 时自动加购`}
            detail="避免在路上突然断网，可随时关闭"
            value={data.auto_topup.enabled ? '已开启' : '未开启'}
            valueColor={data.auto_topup.enabled ? color.teal : color.inkMute}
            onPress={() => Alert.alert('自动加购', '骨架版本先占位。')}
          />
        </>
      ) : null}

      <View style={styles.tail} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: {
    fontSize: size.bodySm,
    color: color.inkSoft,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 14,
  },
  hint: { marginBottom: 4 },
  hintText: { fontSize: size.bodySm, color: color.ink, lineHeight: 21 },
  mono: { fontFamily: font.mono, fontWeight: weight.bold },
  strong: { fontWeight: weight.bold },
  tail: { height: 8 },
});
