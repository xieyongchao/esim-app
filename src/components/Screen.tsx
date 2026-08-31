import type { ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { color, font, gutter, size, weight } from '@/theme';

/**
 * 页面骨架。所有屏共用，保证左右边距、导航栏高度、底部安全区一致。
 *
 * 底部内边距要额外留出 sticky CTA 的高度，否则最后一行内容会被按钮永久遮住 ——
 * 这是滚动页 + 悬浮按钮最常见的低级 bug。
 */

export function NavBar({
  title,
  back,
  onInk,
  right,
}: {
  title?: string;
  back?: boolean;
  onInk?: boolean;
  right?: ReactNode;
}) {
  const fg = onInk ? color.onInk : color.ink;
  return (
    <View
      style={[
        styles.nav,
        onInk ? styles.navInk : null,
      ]}
    >
      {back ? (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="返回"
          hitSlop={12}
          style={styles.navBack}
        >
          <Text style={[styles.navBackText, { color: fg }]}>‹</Text>
        </Pressable>
      ) : (
        <View style={styles.navBack} />
      )}
      <Text numberOfLines={1} style={[styles.navTitle, { color: fg }]}>
        {title ?? ''}
      </Text>
      <View style={styles.navRight}>{right}</View>
    </View>
  );
}

export function Screen({
  children,
  title,
  back,
  onInk,
  navRight,
  scroll = true,
  center,
  cta,
  onRefresh,
  refreshing,
  contentStyle,
}: {
  children: ReactNode;
  title?: string;
  back?: boolean;
  /** 深色底页面（流量详情） */
  onInk?: boolean;
  navRight?: ReactNode;
  scroll?: boolean;
  /** 内容垂直居中 —— 用于结果页、空状态 */
  center?: boolean;
  /** 底部悬浮操作区 */
  cta?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const showNav = title !== undefined || back;
  const bg = onInk ? color.ink : color.paper;

  // CTA 区域高度 + 安全区，避免内容被悬浮按钮遮住
  const bottomPad = (cta ? 92 : 16) + insets.bottom;

  const inner = (
    <View style={[styles.content, center && styles.contentCenter, contentStyle]}>
      {children}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {showNav ? <NavBar title={title} back={back} onInk={onInk} right={navRight} /> : null}
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            { paddingBottom: bottomPad },
            center && styles.scrollCenter,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={onInk ? color.onInk : color.inkMute}
              />
            ) : undefined
          }
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, { paddingBottom: bottomPad }]}>{inner}</View>
      )}
      {cta ? (
        <View
          style={[
            styles.cta,
            onInk ? styles.ctaInk : null,
            { paddingBottom: 12 + insets.bottom },
          ]}
        >
          {cta}
        </View>
      ) : null}
    </View>
  );
}

/** 大标题 + 副标题。副标题写「用户下一步该做什么」，不写产品自夸 */
export function PageTitle({
  title,
  subtitle,
  onInk,
}: {
  title: string;
  subtitle?: string;
  onInk?: boolean;
}) {
  return (
    <View style={styles.titleWrap}>
      <Text style={[styles.h1, onInk && { color: color.onInk }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.h1Sub, onInk && { color: 'rgba(255,255,255,0.55)' }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollCenter: { flexGrow: 1, justifyContent: 'center' },
  content: { paddingHorizontal: gutter, paddingTop: 8 },
  contentCenter: { paddingTop: 0 },

  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
    backgroundColor: color.paper,
  },
  navInk: {
    backgroundColor: color.ink,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  navBack: { width: 40, alignItems: 'center', justifyContent: 'center' },
  navBackText: { fontSize: 27, lineHeight: 30, marginTop: -3 },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14.5,
    fontWeight: weight.semibold,
    letterSpacing: -0.2,
  },
  navRight: { width: 40, alignItems: 'center' },

  cta: {
    paddingHorizontal: gutter,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: color.line,
    backgroundColor: color.paper,
  },
  ctaInk: {
    backgroundColor: color.ink,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },

  titleWrap: { marginTop: 10, marginBottom: 4 },
  h1: {
    fontSize: size.h1,
    fontWeight: weight.heavy,
    color: color.ink,
    letterSpacing: -0.9,
  },
  h1Sub: {
    fontSize: size.bodySm,
    color: color.inkSoft,
    lineHeight: 20,
    marginTop: 7,
  },
});

export const monoStyle = { fontFamily: font.mono } as const;
