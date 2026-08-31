import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { color, size, weight } from '@/theme';

/** 404。Deep link 打错或路由被删时兜底，别让用户看到红屏 */
export default function NotFound() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>🧭</Text>
      <Text style={styles.title}>这个页面不存在</Text>
      <Link href="/" style={styles.link}>
        回到商店
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.paper,
    padding: 24,
  },
  icon: { fontSize: 34, marginBottom: 12 },
  title: { fontSize: 15, fontWeight: weight.bold, color: color.ink, marginBottom: 14 },
  link: { fontSize: size.bodySm, color: color.amberDeep, fontWeight: weight.semibold },
});
