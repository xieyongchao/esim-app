import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { request, USE_MOCK } from '@/api/client';

/**
 * 推送注册。
 *
 * 推送是这个 App 存在的第二个理由（第一个是一键安装）：
 * 「流量剩 20%」和「明天到期」这两条通知只能由 App 发，
 * 网站做不到，而它们恰好命中用户最可能加购的时刻。
 *
 * 注意时机：不要在 App 首次启动时就弹权限请求。
 * 那时用户还不知道通知有什么用，拒绝率很高，而 iOS 只给一次机会 ——
 * 拒绝后就只能引导用户去系统设置里手动打开，转化极低。
 * 正确的时机是「首次安装成功之后」，那时用户已经有一张在用的卡，
 * 「快用完时提醒你」这句话对他是有意义的。
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null; // 模拟器拿不到 token

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    // Android 8+ 必须建 channel，否则通知不显示
    await Notifications.setNotificationChannelAsync('default', {
      name: '流量与到期提醒',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#FFB020',
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  if (!USE_MOCK) {
    await request('/api/v1/devices', {
      method: 'POST',
      body: {
        push_token: token,
        platform: Platform.OS,
        app_version: '1.0.0',
      },
    }).catch(() => null); // 注册失败不该阻塞用户，下次启动会重试
  }

  return token;
}
