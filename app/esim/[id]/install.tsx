import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useActivation, useEsim, useReportInstall } from '@/api/hooks';
import { Screen, PageTitle } from '@/components/Screen';
import { Button, Card, Note, Row, SectionLabel } from '@/components/ui';
import { StatusChip } from '@/components/StatusChip';
import { installContext, installEsim } from '@/lib/esim-install';
import { t } from '@/lib/i18n';
import { USE_MOCK } from '@/api/client';
import { color, font, weight } from '@/theme';

/**
 * 安装引导。一键安装是 App 相对网站最大的差异 —— 网页无法调起系统 eSIM 安装。
 *
 * 装好之后那三条不是客套话，是三个最高频的客服工单：
 * 1. 用户以为装了 eSIM 原号码就没了 → 明说原号码照样收短信
 * 2. 用户没开数据漫游 → 上不了网，占工单量第一
 * 3. 用户以为有效期从购买日算 → 退款纠纷来源
 *
 * 「出发前在 Wi-Fi 下装好」也必须说：安装本身需要联网，
 * 落地后没网就装不上，而那正是用户最需要它的时候。
 */
export default function InstallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: esim } = useEsim(id ?? '');
  const { data: activation } = useActivation(id ?? '');
  const report = useReportInstall(id ?? '');
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!activation || !esim) return;
    setBusy(true);

    if (USE_MOCK) {
      // Mock 模式下没有原生模块，直接走安装中页面把流程跑通
      setBusy(false);
      router.push(`/esim/${esim.id}/installing`);
      return;
    }

    const label = `Voya ${t(esim.destination.name)}`;
    const result = await installEsim(activation.lpa_string, label);
    setBusy(false);

    // 无论成败都上报 —— 失败数据是优化安装引导的唯一依据
    report.mutate({ ...installContext(), result, error_code: null });

    if (result === 'success') {
      router.replace(`/esim/${esim.id}/installed`);
    } else if (result === 'unsupported') {
      Alert.alert(
        '这台设备不支持一键安装',
        '用二维码或手动填写激活码同样可以装上。',
        [{ text: '去手动安装', onPress: () => router.push(`/esim/${esim.id}/manual`) }],
      );
    } else if (result === 'failed') {
      Alert.alert('安装没成功', '可以再试一次，或改用二维码 / 手动安装。');
    }
    // cancelled：用户自己取消的，不打扰
  };

  if (!esim) {
    return (
      <Screen title="安装 eSIM" back scroll={false} center>
        <ActivityIndicator color={color.inkMute} />
      </Screen>
    );
  }

  return (
    <Screen
      title="安装 eSIM"
      back
      cta={
        <>
          <Button label="一键安装" loading={busy} onPress={() => void start()} />
          <Button
            variant="ghost"
            small
            label="用二维码或手动安装"
            style={styles.second}
            onPress={() => router.push(`/esim/${esim.id}/manual`)}
          />
        </>
      }
    >
      <PageTitle title="一键装上" subtitle="系统会弹窗让你确认，点「继续」就好。整个过程约 30 秒。" />

      <Card style={styles.card}>
        <View style={styles.head}>
          <Text style={styles.flag}>{esim.destination.flag_emoji}</Text>
          <View style={styles.headText}>
            <Text style={styles.title}>
              {t(esim.destination.name)} · {esim.data_remaining_label}
            </Text>
            <Text style={styles.spec}>
              {esim.days_remaining !== null
                ? `${esim.days_remaining} 天有效`
                : '连网后开始计时'}
              {' · '}
              {esim.activated_at ? '已激活' : '尚未激活'}
            </Text>
          </View>
          <StatusChip status={esim.status} />
        </View>
      </Card>

      <SectionLabel>装好之后</SectionLabel>
      <Row
        icon="1️⃣"
        label="保持中国卡为主卡"
        detail={`${esim.destination.name} eSIM 只用来上网，原号码照样收短信`}
        chevron={false}
      />
      <Row
        icon="2️⃣"
        label="落地后打开数据漫游"
        detail="仅对这张 eSIM 打开，不会产生原卡漫游费"
        chevron={false}
      />
      <Row
        icon="3️⃣"
        label="首次连网时开始计时"
        detail={`有效期从连上${esim.destination.name}网络那一刻算起，不是从今天`}
        chevron={false}
      />

      <View style={styles.noteWrap}>
        <Note>建议出发前在 Wi-Fi 环境下装好。安装需要联网，落地后没网会装不上。</Note>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 14, marginBottom: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flag: { fontSize: 26, lineHeight: 30 },
  headText: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: weight.bold, color: color.ink },
  spec: {
    fontFamily: font.mono,
    fontSize: 11,
    color: color.inkMute,
    marginTop: 2,
  },
  noteWrap: { marginTop: 18 },
  second: { marginTop: 9 },
});
