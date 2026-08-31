import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/ui';
import { color, font, size, weight } from '@/theme';

/**
 * 安装中。安装过程由系统接管，App 只监听回调状态。
 *
 * 这一屏的唯一职责是「让用户别退出」。进度分三步逐条点亮，
 * 而不是一个转圈 —— 转圈无法区分「在动」和「卡死了」，
 * 逐条点亮能让用户看出进展，愿意多等 20 秒。
 *
 * 真实实现里这三步来自原生回调；Mock 模式下用定时器演示节奏。
 */
const STEPS = ['已下载配置文件', '已校验 ICCID', '正在写入设备…'];

export default function InstallingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 1100);
    const t2 = setTimeout(() => setStep(2), 2300);
    const t3 = setTimeout(() => router.replace(`/esim/${id}/installed`), 3800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [id]);

  return (
    <Screen center>
      <View style={styles.wrap}>
        <ActivityIndicator size="large" color={color.ink} />
        <Text style={styles.h}>正在安装</Text>
        <Text style={styles.p}>请保持网络连接，不要退出 App。</Text>

        <Card style={styles.card}>
          {STEPS.map((s, i) => (
            <Text
              key={s}
              style={[
                styles.step,
                i > 0 && styles.stepGap,
                i < step ? styles.stepDone : i === step ? styles.stepNow : styles.stepWait,
              ]}
            >
              {i < step ? '✓' : i === step ? '◌' : '○'}  {s}
            </Text>
          ))}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  h: {
    fontSize: 19,
    fontWeight: weight.heavy,
    color: color.ink,
    letterSpacing: -0.4,
    marginTop: 22,
    marginBottom: 7,
  },
  p: {
    fontSize: size.bodySm,
    color: color.inkSoft,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 22,
  },
  card: { alignSelf: 'stretch' },
  step: { fontFamily: font.mono, fontSize: size.label },
  stepGap: { marginTop: 8 },
  stepDone: { color: color.teal },
  stepNow: { color: color.ink, fontWeight: weight.semibold },
  stepWait: { color: color.inkMute },
});
