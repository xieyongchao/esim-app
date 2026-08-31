import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEsim } from '@/api/hooks';
import { Screen } from '@/components/Screen';
import { Button, Card, SectionLabel } from '@/components/ui';
import { t } from '@/lib/i18n';
import { color, font, size, weight } from '@/theme';

/**
 * 安装完成。引导打开数据漫游 —— 这是客服工单最集中的一步。
 *
 * 装好 ≠ 能上网。profile 写进设备后，用户还得手动打开这条线路、
 * 打开数据漫游、把蜂窝数据切过去。三步里漏任何一步都上不了网，
 * 然后用户会认为「卡是坏的」。所以这里必须把系统设置路径写成
 * 可以照着念的四行，而不是一句「请开启数据漫游」。
 *
 * 用等宽字体是因为这是「照着抄」的操作路径，等宽让层级缩进看得清。
 */
export default function InstalledScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: esim } = useEsim(id ?? '');
  const name = t(esim?.destination.name);
  const lineLabel = `Voya ${name}`;

  return (
    <Screen center>
      <View style={styles.wrap}>
        <View style={styles.badge}>
          <Text style={styles.badgeMark}>✓</Text>
        </View>
        <Text style={styles.h}>装好了</Text>
        <Text style={styles.p}>
          {name} eSIM 已经在你手机里。{'\n'}落地后打开它的数据漫游就能上网。
        </Text>

        <Card style={styles.card}>
          <SectionLabel first>落地后这样做</SectionLabel>
          <Text style={styles.steps}>
            设置 → 蜂窝网络 → <Text style={styles.strong}>{lineLabel}</Text>
            {'\n'}→ 打开「此线路」
            {'\n'}→ 打开「数据漫游」
            {'\n'}→ 蜂窝数据切到 <Text style={styles.strong}>{lineLabel}</Text>
          </Text>
        </Card>

        <View style={styles.actions}>
          <Button label="查看我的 eSIM" onPress={() => router.replace('/esims')} />
          <Button
            variant="ghost"
            small
            label="把这份说明发到我邮箱"
            style={styles.second}
            onPress={() => Alert.alert('已发送', '安装说明已发到你的注册邮箱。')}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
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
  h: {
    fontSize: size.h2,
    fontWeight: weight.heavy,
    color: color.ink,
    letterSpacing: -0.5,
    marginBottom: 7,
  },
  p: {
    fontSize: 13.5,
    color: color.inkSoft,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: { alignSelf: 'stretch', paddingTop: 4 },
  steps: {
    fontFamily: font.mono,
    fontSize: 12,
    lineHeight: 24,
    color: color.inkSoft,
  },
  strong: { color: color.ink, fontWeight: weight.bold },
  actions: { alignSelf: 'stretch', marginTop: 20 },
  second: { marginTop: 9 },
});
