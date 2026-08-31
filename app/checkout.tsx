import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCreateOrder, useMe, usePlans, useQuote } from '@/api/hooks';
import { Screen } from '@/components/Screen';
import { Button, Card, Note, Row, SectionLabel } from '@/components/ui';
import { money } from '@/lib/format';
import { t } from '@/lib/i18n';
import { openCheckout, orderIdFromReturnUrl } from '@/lib/payment';
import { color, font, size, weight } from '@/theme';

/**
 * 确认订单。下单走网站同一套订单与优惠券逻辑，App 不重算价格。
 *
 * 报价（subtotal / 折扣 / 税 / 总额）全部来自 POST /orders/quote。
 * App 端连「58 - 5.8 = 52.2」这种减法都不做 —— 一旦两端各算一次，
 * 迟早会出现 App 显示一个价、扣款另一个价，那是最难解释的客服场景。
 */
export default function CheckoutScreen() {
  const { plan: planId, slug } = useLocalSearchParams<{ plan: string; slug: string }>();
  const { data: plansData } = usePlans(slug ?? 'japan');
  const { data: quote, isLoading: quoteLoading } = useQuote(planId ?? '', 'FIRST10');
  const { data: me } = useMe();
  const createOrder = useCreateOrder();
  const [paying, setPaying] = useState(false);

  const plan = plansData?.plans.find((p) => p.id === planId);
  const dest = plansData?.destination;

  const pay = async () => {
    if (!planId || !me) return;
    setPaying(true);
    try {
      const res = await createOrder.mutateAsync({
        plan_id: planId,
        promo_code: quote?.promo_valid ? 'FIRST10' : null,
        email: me.email,
      });

      const outcome = await openCheckout(res.payment);
      if (outcome.kind === 'dismissed') {
        // 用户主动关掉了支付页。订单还在 pending_payment，不当作失败处理
        setPaying(false);
        return;
      }

      const orderId = orderIdFromReturnUrl(outcome.url) ?? res.order.id;
      // 回跳后进结果页轮询服务端 —— 回跳本身不是支付成功的凭证
      router.replace(`/order/${orderId}/result`);
    } catch (e) {
      Alert.alert('下单失败', e instanceof Error ? e.message : '稍后再试');
    } finally {
      setPaying(false);
    }
  };

  if (quoteLoading || !quote || !plan || !dest) {
    return (
      <Screen title="确认订单" back scroll={false} center>
        <ActivityIndicator color={color.inkMute} />
      </Screen>
    );
  }

  return (
    <Screen
      title="确认订单"
      back
      cta={
        <Button
          variant="amber"
          label={`支付 ${money(quote.total, quote.currency)}`}
          loading={paying}
          onPress={() => void pay()}
        />
      }
    >
      <Card style={styles.summary}>
        <View style={styles.head}>
          <Text style={styles.flag}>{dest.flag_emoji}</Text>
          <View style={styles.headText}>
            <Text style={styles.title}>{t(dest.name)} eSIM</Text>
            <Text style={styles.spec}>
              {t(plan.data_label)} · {plan.validity_days} 天
            </Text>
          </View>
        </View>

        <View style={styles.lines}>
          <Line label="套餐价" value={money(quote.subtotal, quote.currency)} />
          {quote.discounts.map((d) => (
            <Line
              key={d.code}
              label={d.label}
              value={`−${money(Math.abs(d.amount), quote.currency)}`}
              color={color.teal}
            />
          ))}
          {quote.tax > 0 ? (
            <Line label="税费" value={money(quote.tax, quote.currency)} />
          ) : null}
          {quote.credit_applied > 0 ? (
            <Line
              label="账户余额抵扣"
              value={`−${money(quote.credit_applied, quote.currency)}`}
              color={color.teal}
            />
          ) : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>应付</Text>
            <Text style={styles.totalValue}>{money(quote.total, quote.currency)}</Text>
          </View>
        </View>
      </Card>

      <Row
        icon="🏷️"
        label="优惠码"
        value={quote.promo_valid ? '已用 FIRST10' : quote.promo_error ?? '添加'}
        valueColor={quote.promo_valid ? color.teal : undefined}
        onPress={() => Alert.alert('优惠码', '骨架版本先占位。')}
      />

      <SectionLabel>接收邮箱</SectionLabel>
      <Row
        icon="✉️"
        label={me?.email ?? '—'}
        detail="安装码和发票会发到这里"
        onPress={() => Alert.alert('接收邮箱', '骨架版本先占位。')}
      />

      <SectionLabel>支付方式</SectionLabel>
      <Row
        icon="💳"
        label="银行卡 · Visa 4242"
        detail="在安全支付页完成，支持 3D 验证"
        highlight
        onPress={() => Alert.alert('支付方式', '在内嵌支付页选择。')}
      />
      <Row icon="🍎" label="Apple Pay" onPress={() => Alert.alert('Apple Pay', '骨架版本先占位。')} />
      <Row icon="🅿️" label="PayPal" onPress={() => Alert.alert('PayPal', '骨架版本先占位。')} />

      <View style={styles.noteWrap}>
        <Note>
          流量套餐在 App 外使用，按 App Store 规则 3.1.3(e) 可以走自有支付，不必接内购。
          商品文案里避免写成「App 内解锁」。
        </Note>
      </View>
    </Screen>
  );
}

function Line({
  label,
  value,
  color: c,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={[styles.lineValue, c ? { color: c } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { marginTop: 10, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 13 },
  flag: { fontSize: 28, lineHeight: 32 },
  headText: { flex: 1, minWidth: 0 },
  title: { fontSize: 15.5, fontWeight: weight.bold, color: color.ink },
  spec: {
    fontFamily: font.mono,
    fontSize: 12,
    color: color.inkSoft,
    marginTop: 2,
  },

  lines: { borderTopWidth: 1, borderTopColor: color.line, paddingTop: 10 },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 5,
  },
  lineLabel: { fontSize: size.bodySm, color: color.inkSoft },
  lineValue: {
    fontFamily: font.mono,
    fontSize: size.bodySm,
    fontWeight: weight.semibold,
    color: color.ink,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 12,
  },
  totalLabel: { fontSize: size.bodySm, fontWeight: weight.bold, color: color.ink },
  totalValue: {
    fontFamily: font.mono,
    fontSize: size.h3,
    fontWeight: weight.bold,
    color: color.ink,
    letterSpacing: -0.4,
  },

  noteWrap: { marginTop: 18 },
});
