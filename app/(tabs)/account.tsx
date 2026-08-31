import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useMe, usePreferences, useReferral } from '@/api/hooks';
import { Screen, PageTitle } from '@/components/Screen';
import { Card, Row, SectionLabel } from '@/components/ui';
import { money } from '@/lib/format';
import { LOCALE_LABEL } from '@/lib/i18n';
import { color, font, size, weight } from '@/theme';

/**
 * 我的。账户体系与网站共用 —— 同一个账号必须能同时登网站和 App，
 * 否则用户在网站买的卡在 App 里看不到，那 App 就没有存在意义了。
 */
export default function AccountScreen() {
  const { data: me } = useMe();
  const { data: prefs } = usePreferences();
  const { data: referral } = useReferral();

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const share = async () => {
    if (!referral) return;
    await Share.share({
      message: `送你 ${money(referral.friend_discount, referral.currency)} eSIM 优惠：${referral.share_url}`,
    });
  };

  return (
    <Screen>
      <PageTitle title="我的" />

      <Card style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {me?.display_name?.slice(0, 1).toUpperCase() ?? '·'}
          </Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.name}>{me?.display_name ?? '—'}</Text>
          <Text style={styles.email}>{me?.email ?? '—'}</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </Card>

      <SectionLabel>订单与账单</SectionLabel>
      <Row
        icon="🧾"
        label="订单记录"
        detail="发票、退款、重发安装码"
        onPress={() => router.push('/orders')}
      />
      <Row
        icon="💳"
        label="支付方式"
        value="Visa 4242"
        onPress={() => Alert.alert('支付方式', '骨架版本先占位。')}
      />

      <SectionLabel>推荐好友</SectionLabel>
      <Row
        icon="🎁"
        iconBg={color.amberSoft}
        label={
          referral
            ? `送 ${money(referral.friend_discount, referral.currency)}，得 ${money(referral.reward_per_invite, referral.currency)}`
            : '推荐好友'
        }
        detail="朋友首单立减，你也拿等额余额"
        value={referral ? `已得 ${money(referral.total_earned, referral.currency)}` : undefined}
        valueColor={color.amberDeep}
        onPress={() => void share()}
      />

      <SectionLabel>设置</SectionLabel>
      <Row
        icon="🌐"
        label="语言与货币"
        value={
          prefs ? `${LOCALE_LABEL[prefs.locale]} · ${prefs.currency}` : undefined
        }
        onPress={() => router.push('/preferences')}
      />
      <Row
        icon="🔔"
        label="通知"
        detail="流量剩 20%、到期前 1 天提醒"
        value={prefs?.notify_low_data ? '已开启' : '已关闭'}
        valueColor={prefs?.notify_low_data ? color.teal : color.inkMute}
        onPress={() => Alert.alert('通知', '需要原生推送权限，见 Task 14。')}
      />
      <Row
        icon="📄"
        label="条款与隐私"
        onPress={() => Alert.alert('条款与隐私', '骨架版本先占位。')}
      />
      <Row
        icon="⭐"
        label="给 App 评分"
        onPress={() => Alert.alert('评分', '上线后接 StoreReview。')}
      />

      <Text style={styles.version}>Voya eSIM {version} (1)</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 19, fontWeight: weight.bold, color: color.onInk },
  profileText: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: weight.bold, color: color.ink },
  email: { fontSize: size.label, color: color.inkMute, marginTop: 2 },
  chev: { fontSize: 15, color: color.inkMute },

  version: {
    fontFamily: font.mono,
    fontSize: 10,
    color: color.inkMute,
    textAlign: 'center',
    marginTop: 24,
  },
});
