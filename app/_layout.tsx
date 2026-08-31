import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Providers } from '@/api/providers';
import { color } from '@/theme';

/**
 * 根布局。
 *
 * 全部走 Stack 而不是把 Tab 放在最外层，是为了让购买流程（目的地 → 结账 → 支付结果）
 * 能全屏盖住 Tab 栏。购买过程中露出底部 Tab 会诱导用户中途跳走，
 * 这是转化漏斗上最不该自己挖的坑。安装流程同理。
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Providers>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: color.paper },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="destination/[slug]" />
          <Stack.Screen name="checkout" />
          <Stack.Screen
            name="order/[id]/result"
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen name="esim/[id]/index" />
          <Stack.Screen name="esim/[id]/install" />
          <Stack.Screen
            name="esim/[id]/installing"
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen
            name="esim/[id]/installed"
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen name="esim/[id]/manual" />
          <Stack.Screen name="esim/[id]/topup" />
          <Stack.Screen name="orders" />
          <Stack.Screen name="preferences" />
        </Stack>
      </Providers>
    </SafeAreaProvider>
  );
}
