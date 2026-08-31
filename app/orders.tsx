import { useMemo } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import type { Order } from '@shared/api-types';
import { useOrders } from '@/api/hooks';
import { Screen } from '@/components/Screen';
import { Note, Row, SectionLabel } from '@/components/ui';
import { money } from '@/lib/format';
import { color } from '@/theme';

/**
 * 订单记录。订单历史与网站完全一致 —— 用户在网站买的，App 里必须看得到。
 *
 * channel 字段（app / web）显式标出来，不是为了好看：
 * 用户在网站买完卡、下载 App，第一件事就是确认「我买的东西在不在」。
 * 看到「在网站购买」这四个字，他才相信两端是同一个账号、同一份数据。
 * 这是把 App 从「另一个入口」变成「同一个服务」的关键一笔。
 */
const STATUS_TEXT: Record<Order['status'], string | null> = {
  completed: null,
  paid: '开通中',
  pending_payment: '待支付',
  provisioning_failed: '开通失败',
  refunded: '已退款',
  expired: '已过期',
  cancelled: '已取消',
};

export default function OrdersScreen() {
  const { data: orders, isLoading } = useOrders();

  // 按月分组。旅行是按「趟」发生的，按月分组正好对上用户对行程的记忆
  const groups = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of orders ?? []) {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
      const arr = map.get(key);
      if (arr) arr.push(o);
      else map.set(key, [o]);
    }
    return [...map.entries()];
  }, [orders]);

  if (isLoading) {
    return (
      <Screen title="订单记录" back scroll={false} center>
        <ActivityIndicator color={color.inkMute} />
      </Screen>
    );
  }

  return (
    <Screen title="订单记录" back>
      {groups.map(([label, list], gi) => (
        <ItemGroup key={label} label={label} list={list} first={gi === 0} />
      ))}
      <Note>
        在网站买的订单这里也能看到，因为 App 和网站共用同一套账号和订单数据。
      </Note>
    </Screen>
  );
}

function ItemGroup({
  label,
  list,
  first,
}: {
  label: string;
  list: Order[];
  first: boolean;
}) {
  return (
    <>
      <SectionLabel first={first}>{label}</SectionLabel>
      {list.map((o) => {
        const item = o.items[0];
        const d = new Date(o.created_at);
        const status = STATUS_TEXT[o.status];
        const source = o.channel === 'web' ? '在网站购买' : '在 App 购买';
        return (
          <Row
            key={o.id}
            icon={item?.flag_emoji ?? '🧾'}
            label={
              item
                ? `${item.destination_name} · ${item.data_label} / ${item.validity_days} 天`
                : o.order_no
            }
            detail={`${d.getMonth() + 1}月${d.getDate()}日 · ${o.order_no} · ${source}${status ? ` · ${status}` : ''}`}
            value={money(o.total, o.currency)}
            onPress={() =>
              item?.esim_id
                ? router.push(`/esim/${item.esim_id}`)
                : Alert.alert(o.order_no, '这个订单还没有对应的 eSIM。')
            }
          />
        );
      })}
    </>
  );
}
