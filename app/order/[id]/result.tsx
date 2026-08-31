import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useOrder } from '@/api/hooks';
import { Screen } from '@/components/Screen';
import { Button, Card } from '@/components/ui';
import { money } from '@/lib/format';
import { color, font, size, weight } from '@/theme';

/**
 * 支付结果。支付页通过 deep link 回到这里，但真实状态以服务端为准。
 *
 * 三种状态必须分开显示：
 * - paid：钱收到了，卡还在开。上游偶发故障时用户停在这里，
 *   文案要明确「钱没丢，正在开卡」，否则用户立刻去投诉。
 * - completed：卡开好了，这才给安装入口。
 * - provisioning_failed：开卡失败，直接给退款/客服出口，不要让用户自己找。
 *
 * 把 paid 和 completed 混成一个「成功」页，是这类产品最常见的设计错误 ——
 * 它会在上游抖动时把「正常等待」变成「用户以为被骗了」。
 */
export default function OrderResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // 服务端 webhook 确认后才开卡，所以要轮询
  const { data: order, isLoading } = useOrder(id ?? '', true);

  if (isLoading || !order) {
    return (
      <Screen scroll={false} center>
        <View style={styles.mid}>
          <ActivityIndicator color={color.inkMute} />
          <Text style={styles.waitText}>正在确认支付结果…</Text>
        </View>
      </Screen>
    );
  }

  const item = order.items[0];
  const esimId = item?.esim_id;

  if (order.status === 'provisioning_failed') {
    return (
      <Screen center>
        <View style={styles.wrap}>
          <View style={[styles.badge, styles.badgeFail]}>
            <Text style={styles.badgeFailMark}>!</Text>
          </View>
          <Text style={styles.h}>开卡没成功</Text>
          <Text style={styles.p}>
            钱已经收到，但上游开卡失败了。{'\n'}我们会自动重试，10 分钟内没好会全额退款。
          </Text>
          <OrderCard orderNo={order.order_no} total={order.total} currency={order.currency} />
          <View style={styles.actions}>
            <Button label="联系客服" onPress={() => router.replace('/help')} />
            <Button
              variant="ghost"
              small
              label="查看订单"
              style={styles.second}
              onPress={() => router.replace('/orders')}
            />
          </View>
        </View>
      </Screen>
    );
  }

  // paid：钱收到了，卡还在开 —— 必须和 completed 分开
  if (order.status === 'paid' || order.status === 'pending_payment') {
    return (
      <Screen center>
        <View style={styles.wrap}>
          <ActivityIndicator color={color.inkMute} size="large" />
          <Text style={[styles.h, styles.hSpaced]}>正在开卡</Text>
          <Text style={styles.p}>
            款项已收到，正在为你开通 eSIM。{'\n'}通常十几秒，请不要退出。
          </Text>
          <OrderCard orderNo={order.order_no} total={order.total} currency={order.currency} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen center>
      <View style={styles.wrap}>
        <View style={styles.badge}>
          <Text style={styles.badgeMark}>✓</Text>
        </View>
        <Text style={styles.h}>已付款</Text>
        <Text style={styles.p}>
          {item ? `${item.destination_name} ${item.data_label} eSIM 已经开好了。` : 'eSIM 已经开好了。'}
          {'\n'}建议现在就装上，落地开机即可用。
        </Text>
        <OrderCard orderNo={order.order_no} total={order.total} currency={order.currency} />
        <View style={styles.actions}>
          <Button
            label="现在安装"
            onPress={() =>
              esimId ? router.replace(`/esim/${esimId}/install`) : router.replace('/esims')
            }
          />
          <Button
            variant="ghost"
            small
            label="稍后在「我的 eSIM」里装"
            style={styles.second}
            onPress={() => router.replace('/esims')}
          />
        </View>
      </View>
    </Screen>
  );
}

function OrderCard({
  orderNo,
  total,
  currency,
}: {
  orderNo: string;
  total: number;
  currency: 'CNY' | 'USD' | 'EUR';
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardLine}>
        <Text style={styles.cardLabel}>订单号</Text>
        <Text style={styles.cardValue}>{orderNo}</Text>
      </View>
      <View style={[styles.cardLine, styles.cardLineGap]}>
        <Text style={styles.cardLabel}>金额</Text>
        <Text style={styles.cardValue}>{money(total, currency)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  mid: { alignItems: 'center', gap: 14 },
  waitText: { fontSize: size.bodySm, color: color.inkSoft },

  wrap: { alignItems: 'center', paddingHorizontal: 4 },
  badge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: color.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  badgeMark: { fontSize: 30, color: color.teal, fontWeight: weight.bold },
  badgeFail: { backgroundColor: color.alertSoft },
  badgeFailMark: { fontSize: 30, color: color.alert, fontWeight: weight.heavy },

  h: {
    fontSize: size.h2,
    fontWeight: weight.heavy,
    color: color.ink,
    letterSpacing: -0.5,
    marginBottom: 7,
  },
  hSpaced: { marginTop: 22 },
  p: {
    fontSize: 13.5,
    color: color.inkSoft,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },

  card: { alignSelf: 'stretch' },
  cardLine: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLineGap: { marginTop: 7 },
  cardLabel: { fontFamily: font.mono, fontSize: size.label, color: color.inkSoft },
  cardValue: {
    fontFamily: font.mono,
    fontSize: size.label,
    fontWeight: weight.bold,
    color: color.ink,
  },

  actions: { alignSelf: 'stretch', marginTop: 22 },
  second: { marginTop: 9 },
});
