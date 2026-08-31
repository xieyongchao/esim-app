import { Alert, Linking } from 'react-native';
import { Screen, PageTitle } from '@/components/Screen';
import { Row, SectionLabel } from '@/components/ui';
import { color } from '@/theme';

/**
 * 帮助。把「连不上网」做成自查流程，能砍掉大部分人工客服工单。
 *
 * 排序是按真实工单量，不是按逻辑顺序：「装好了上不了网」永远第一，
 * 因为绝大多数是忘开数据漫游。第二是有效期争议 ——
 * 用户以为从购买日算起，实际从首次连网算起，这条不说清楚就是退款纠纷。
 */
const FAQ = [
  {
    icon: '📵',
    iconBg: color.alertSoft,
    label: '装好了但上不了网',
    detail: '按 4 步自查：线路开关、数据漫游、APN、重启',
  },
  {
    icon: '⏱️',
    label: '有效期什么时候开始算',
    detail: '从首次连上当地网络算起，不是购买日',
  },
  {
    icon: '📱',
    label: '我的手机支持 eSIM 吗',
    detail: '查机型清单，或用 *#06# 检查 EID',
  },
  {
    icon: '📞',
    label: '能打电话发短信吗',
    detail: '流量卡不含通话，可用微信等网络通话',
  },
  {
    icon: '🔄',
    label: '删掉了还能重装吗',
    detail: '大部分套餐只能装一次，删除前请确认',
  },
];

export default function HelpScreen() {
  const notImplemented = (what: string) =>
    Alert.alert(what, '骨架版本先占位，接入真实内容后打开对应页面。');

  return (
    <Screen>
      <PageTitle title="需要帮忙？" subtitle="大部分问题两分钟能自己解决。解决不了就找人。" />

      <SectionLabel first>最常见的问题</SectionLabel>
      {FAQ.map((f) => (
        <Row
          key={f.label}
          icon={f.icon}
          iconBg={f.iconBg}
          label={f.label}
          detail={f.detail}
          onPress={() => notImplemented(f.label)}
        />
      ))}

      <SectionLabel>还是没解决</SectionLabel>
      <Row
        icon="💬"
        iconBg={color.tealSoft}
        label="找真人客服"
        detail="中文在线，平均 3 分钟内回复 · 24 小时"
        highlight
        onPress={() => notImplemented('在线客服')}
      />
      <Row
        icon="📧"
        label="发邮件"
        detail="会带上你的订单和设备信息，不用自己描述"
        onPress={() => {
          void Linking.openURL('mailto:support@voyaesim.com?subject=eSIM 使用问题');
        }}
      />
    </Screen>
  );
}
