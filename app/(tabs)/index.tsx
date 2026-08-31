import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import type { CatalogFilter, Destination } from '@shared/api-types';
import { useDestinations, useRegions } from '@/api/hooks';
import { Screen, PageTitle } from '@/components/Screen';
import { Row, SectionLabel } from '@/components/ui';
import { money } from '@/lib/format';
import { t } from '@/lib/i18n';
import { color, font, radius, size, weight } from '@/theme';

/**
 * 筛选器。key 用契约的 CatalogFilter（`region:asia` 而不是裸 `asia`），
 * 因为 popular / multi 和地区是两种性质不同的东西 —— 混进一个枚举里
 * 迟早会出现「popular 和 asia 同时选中」这种没有意义的状态。
 */
const FILTERS: { key: CatalogFilter; label: string }[] = [
  { key: 'popular', label: '热门' },
  { key: 'region:asia', label: '亚洲' },
  { key: 'region:europe', label: '欧洲' },
  { key: 'region:americas', label: '美洲' },
  { key: 'multi', label: '多国套餐' },
];

/**
 * 商店。必须原生实现 —— 纯 WebView 套壳会被 App Store 按 4.2 条（最低功能要求）拒审。
 * 但套餐和价格全部来自网站同一套目录接口，不另维护一份数据。
 *
 * 目的地用九宫格而不是列表：选国家是「认图形」的任务，国旗比文字扫得快得多。
 * 「最低 ¥39 起」必须显示 —— 用户在这一屏做的决定是「值不值得点进去」。
 */
export default function StoreScreen() {
  const [filter, setFilter] = useState<CatalogFilter>('popular');
  const [q, setQ] = useState('');
  const { data: dests, isLoading } = useDestinations(filter);
  const { data: regions } = useRegions();

  const filtered = useMemo(() => {
    const list = dests ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    // 中英双语都匹配：用英文键盘的用户会打 "japan"，中文用户打「日本」，
    // 只搜当前语言会让另一半用户以为没这个国家
    return list.filter(
      (d) =>
        d.name.zh.toLowerCase().includes(needle) || d.name.en.toLowerCase().includes(needle),
    );
  }, [dests, q]);

  const openDestination = (slug: string) => router.push(`/destination/${slug}`);

  return (
    <Screen>
      <PageTitle title="去哪里？" subtitle="选好目的地，落地就能上网。不用换实体卡。" />

      <View style={styles.search}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="搜索国家或地区"
          placeholderTextColor={color.inkMute}
          style={styles.searchInput}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pills}
        contentContainerStyle={styles.pillsInner}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.pill, filter === f.key && styles.pillOn]}
          >
            <Text style={[styles.pillText, filter === f.key && styles.pillTextOn]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <SectionLabel>{filter === 'multi' ? '多国套餐' : '热门目的地'}</SectionLabel>

      {isLoading ? (
        <View style={styles.grid}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.dest, styles.destSkeleton]} />
          ))}
        </View>
      ) : (
        <View style={styles.grid}>
          {filtered.map((d) => (
            <DestTile key={d.slug} dest={d} onPress={() => openDestination(d.slug)} />
          ))}
        </View>
      )}

      {filtered.length === 0 && !isLoading ? (
        <Text style={styles.noHit}>没找到「{q}」。换个说法试试，或看看下面的多国套餐。</Text>
      ) : null}

      {filter !== 'multi' ? (
        <>
          <SectionLabel>多国通用</SectionLabel>
          {(regions ?? []).map((r) => (
            <Row
              key={r.slug}
              icon={r.flag_emoji}
              label={t(r.name)}
              detail={t(r.tagline)}
              value={`${money(r.from_price, r.currency)} 起`}
              onPress={() => openDestination(r.slug)}
            />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function DestTile({ dest, onPress }: { dest: Destination; onPress: () => void }) {
  const name = t(dest.name);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}，最低 ${money(dest.from_price, dest.currency)} 起`}
      style={({ pressed }) => [styles.dest, pressed && { opacity: 0.8 }]}
    >
      <Text style={styles.destFlag}>{dest.flag_emoji}</Text>
      <Text style={styles.destName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.destPrice}>
        最低 <Text style={styles.destPriceNum}>{money(dest.from_price, dest.currency)}</Text> 起
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 12,
    paddingHorizontal: 13,
    height: 44,
    marginTop: 16,
  },
  searchIcon: { fontSize: 15, color: color.inkMute },
  searchInput: { flex: 1, fontSize: size.body, color: color.ink, padding: 0 },

  pills: { marginTop: 12, marginHorizontal: -20 },
  pillsInner: { paddingHorizontal: 20, gap: 7 },
  pill: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillOn: { backgroundColor: color.ink, borderColor: color.ink },
  pillText: { fontSize: 12.5, fontWeight: weight.medium, color: color.inkSoft },
  pillTextOn: { color: color.onInk },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  dest: {
    width: '31.5%',
    flexGrow: 1,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 13,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  destSkeleton: { height: 104, opacity: 0.5 },
  destFlag: { fontSize: 27, lineHeight: 32 },
  destName: {
    fontSize: size.bodySm,
    fontWeight: weight.semibold,
    color: color.ink,
    marginTop: 6,
  },
  destPrice: {
    fontFamily: font.mono,
    fontSize: 9.5,
    color: color.inkMute,
    marginTop: 4,
  },
  destPriceNum: { color: color.ink, fontWeight: weight.bold },

  noHit: {
    fontSize: size.bodySm,
    color: color.inkSoft,
    lineHeight: 20,
    paddingVertical: 20,
  },
});
