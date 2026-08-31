import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useActivation } from '@/api/hooks';
import { Screen } from '@/components/Screen';
import { Button, Card, KV, Note } from '@/components/ui';
import { formatIccid } from '@/lib/format';
import { color, font, size } from '@/theme';

/**
 * 二维码 / 手动安装。兜底路径：一键安装失败、或用户要在另一台设备上装。
 *
 * ⚠️ 这一屏必须离线可用。useActivation 的 staleTime/gcTime 都是 Infinity，
 * 配合 AsyncStorage persister 落盘（见 api/providers.tsx）。
 * 用户落地东京、还没连上网、一键安装又失败了 —— 这是最需要这一屏的时刻，
 * 而这时任何需要发请求的实现都会白屏。这条是最容易漏但漏了会挨骂的。
 *
 * 二维码本地用 react-native-qrcode-svg 生成，不用服务端返回图片 ——
 * 同样是为了离线可用，而且省一次请求。
 */
export default function ManualScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: a, isLoading } = useActivation(id ?? '');

  const copyAll = async () => {
    if (!a) return;
    await Clipboard.setStringAsync(
      `SM-DP+ 地址：${a.smdp_address}\n激活码：${a.activation_code}\nICCID：${a.iccid}`,
    );
    Alert.alert('已复制', '三项信息都在剪贴板里了。');
  };

  if (isLoading || !a) {
    return (
      <Screen title="二维码 / 手动安装" back scroll={false} center>
        <ActivityIndicator color={color.inkMute} />
      </Screen>
    );
  }

  return (
    <Screen
      title="二维码 / 手动安装"
      back
      cta={<Button variant="ghost" label="复制全部信息" onPress={() => void copyAll()} />}
    >
      <Text style={styles.lead}>用另一台手机扫这个码，或者手动填下面三项。</Text>

      <Card style={styles.qrCard}>
        <View style={styles.qrBox}>
          <QRCode
            value={a.qr_payload}
            size={168}
            color={color.ink}
            backgroundColor="#FFFFFF"
          />
        </View>
        <Text style={styles.qrHint}>设置 → 蜂窝网络 → 添加 eSIM → 扫描二维码</Text>
      </Card>

      <Card style={styles.fields}>
        <KV label="SM-DP+ 地址" value={a.smdp_address} stacked />
        <KV label="激活码" value={a.activation_code} stacked />
        <KV label="ICCID" value={formatIccid(a.iccid)} stacked last />
      </Card>

      <View style={styles.noteWrap}>
        <Note>
          这张卡最多可安装 {a.max_installs} 次，已用 {a.install_count} 次。
          删除后通常无法重装，删除前请确认。
        </Note>
      </View>
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
  qrCard: { alignItems: 'center', marginBottom: 14 },
  qrBox: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.line,
  },
  qrHint: {
    fontFamily: font.mono,
    fontSize: size.caption,
    color: color.inkMute,
    marginTop: 12,
    textAlign: 'center',
  },
  fields: { paddingVertical: 4 },
  noteWrap: { marginTop: 14 },
});
