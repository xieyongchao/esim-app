import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useEsims } from '@/api/hooks';
import { color, font, weight } from '@/theme';

/**
 * 底部 Tab。
 *
 * 「我的 eSIM」放第二位而不是第一位：新用户第一次打开是空的，
 * 直接给空页面不如给商店。但一旦有卡在用，这一屏才是用户天天回来看的。
 * 有卡在用时给它加个小圆点，让用户知道那里有活的东西。
 *
 * 用 emoji 而不是图标库：省一个依赖，且 emoji 在中日韩系统上渲染都稳定。
 * 真要上线可以换成 SF Symbols / Material Icons，但不影响骨架验证。
 */
function TabIcon({
  glyph,
  focused,
  dot,
}: {
  glyph: string;
  focused: boolean;
  dot?: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.glyph, !focused && styles.glyphDim]}>{glyph}</Text>
      {dot ? <View style={styles.dot} /> : null}
    </View>
  );
}

export default function TabsLayout() {
  const { data: esims } = useEsims();
  const hasLive = !!esims?.some(
    (e) => e.status === 'active' || e.status === 'ready' || e.status === 'installed',
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.ink,
        tabBarInactiveTintColor: color.inkMute,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '商店',
          tabBarIcon: ({ focused }) => <TabIcon glyph="🧭" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="esims"
        options={{
          title: '我的 eSIM',
          tabBarIcon: ({ focused }) => (
            <TabIcon glyph="🎫" focused={focused} dot={hasLive} />
          ),
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          title: '帮助',
          tabBarIcon: ({ focused }) => <TabIcon glyph="💬" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: '我的',
          tabBarIcon: ({ focused }) => <TabIcon glyph="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: color.card,
    borderTopWidth: 1,
    borderTopColor: color.line,
    height: 58,
    paddingTop: 6,
  },
  item: { paddingVertical: 2 },
  label: {
    fontFamily: font.mono,
    fontSize: 9.5,
    fontWeight: weight.medium,
    letterSpacing: 0.2,
  },
  iconWrap: { width: 26, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 18, lineHeight: 22 },
  glyphDim: { opacity: 0.45 },
  dot: {
    position: 'absolute',
    top: 0,
    right: -1,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: color.amber,
    borderWidth: 1.5,
    borderColor: color.card,
  },
});
