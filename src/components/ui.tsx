import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { color, font, radius, size, weight } from '@/theme';

// ─────────────────── 按钮 ───────────────────

export function Button({
  label,
  onPress,
  variant = 'primary',
  small,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'amber' | 'ghost';
  small?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg =
    variant === 'amber' ? color.amber : variant === 'ghost' ? color.card : color.ink;
  const fg =
    variant === 'amber' ? color.onAmber : variant === 'ghost' ? color.ink : color.onInk;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSm,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.88 : 1 },
        variant === 'ghost' && styles.btnGhost,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[styles.btnLabel, small && styles.btnLabelSm, { color: fg }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

// ─────────────────── 列表行 ───────────────────

export function Row({
  icon,
  iconBg,
  label,
  detail,
  value,
  valueColor,
  onPress,
  chevron = true,
  highlight,
}: {
  icon?: string;
  iconBg?: string;
  label: string;
  detail?: string;
  value?: string;
  valueColor?: string;
  onPress?: () => void;
  chevron?: boolean;
  highlight?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [
        styles.row,
        highlight && styles.rowHighlight,
        pressed && onPress ? { opacity: 0.75 } : null,
      ]}
    >
      {icon ? (
        <View style={[styles.ico, iconBg ? { backgroundColor: iconBg } : null]}>
          <Text style={styles.icoText}>{icon}</Text>
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {value ? (
        <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>
          {value}
        </Text>
      ) : null}
      {chevron && onPress ? <Text style={styles.chev}>›</Text> : null}
    </Pressable>
  );
}

// ─────────────────── 分节标题 ───────────────────

export function SectionLabel({
  children,
  onInk,
  first,
}: {
  children: string;
  onInk?: boolean;
  first?: boolean;
}) {
  return (
    <View style={[styles.sec, first && styles.secFirst]}>
      <Text style={[styles.secText, onInk && { color: 'rgba(255,255,255,0.42)' }]}>
        {children}
      </Text>
      <View
        style={[styles.secLine, onInk && { backgroundColor: 'rgba(255,255,255,0.14)' }]}
      />
    </View>
  );
}

// ─────────────────── 卡片 ───────────────────

export function Card({
  children,
  style,
  accent,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  /** 左侧强调条，用于需要用户注意的信息 */
  accent?: boolean;
}) {
  return (
    <View style={[styles.card, accent && styles.cardAccent, style]}>{children}</View>
  );
}

/** 键值对行，值用等宽字体 —— 便于纵向扫读和人工核对 */
export function KV({
  label,
  value,
  last,
  onInk,
  stacked,
}: {
  label: string;
  value: string;
  last?: boolean;
  onInk?: boolean;
  /** 值太长时改为上下排列，如激活码 */
  stacked?: boolean;
}) {
  return (
    <View
      style={[
        styles.kv,
        stacked && styles.kvStacked,
        last && styles.kvLast,
        onInk && { borderBottomColor: 'rgba(255,255,255,0.1)' },
      ]}
    >
      <Text style={[styles.kvLabel, onInk && { color: 'rgba(255,255,255,0.55)' }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.kvValue,
          stacked && styles.kvValueStacked,
          onInk && { color: color.onInk },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/** 提示条。左侧琥珀色竖条，用于购买前须知、注意事项 */
export function Note({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.note}>
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

// ─────────────────── 空状态 ───────────────────

export function EmptyState({
  icon,
  title,
  detail,
  action,
}: {
  icon: string;
  title: string;
  detail: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
      {action ? (
        <Button label={action.label} onPress={action.onPress} style={styles.emptyBtn} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSm: { paddingVertical: 11, borderRadius: radius.md },
  btnGhost: { borderWidth: 1, borderColor: color.line },
  btnLabel: {
    fontSize: 14.5,
    fontWeight: weight.bold,
    letterSpacing: -0.2,
  },
  btnLabelSm: { fontSize: 13 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  rowHighlight: {
    borderColor: color.ink,
    borderWidth: 1.5,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowLabel: {
    fontSize: size.bodySm,
    fontWeight: weight.semibold,
    color: color.ink,
    letterSpacing: -0.1,
  },
  rowDetail: {
    fontSize: size.label,
    color: color.inkMute,
    marginTop: 2,
    lineHeight: 16,
  },
  rowValue: {
    fontFamily: font.mono,
    fontSize: size.label,
    color: color.inkSoft,
  },
  chev: { fontSize: 15, color: color.inkMute },

  ico: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icoText: { fontSize: 16 },

  sec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 10,
  },
  secFirst: { marginTop: 4 },
  secText: {
    fontFamily: font.mono,
    fontSize: size.micro,
    letterSpacing: 1.3,
    color: color.inkMute,
  },
  secLine: { flex: 1, height: 1, backgroundColor: color.line },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.lg,
    padding: 15,
  },
  cardAccent: { borderLeftWidth: 3, borderLeftColor: color.amber },

  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  kvStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  kvLast: { borderBottomWidth: 0 },
  kvLabel: { fontSize: size.bodySm, color: color.inkSoft },
  kvValue: {
    fontFamily: font.mono,
    fontSize: size.bodySm,
    fontWeight: weight.semibold,
    color: color.ink,
    textAlign: 'right',
  },
  kvValueStacked: { textAlign: 'left', fontSize: size.label },

  note: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.line,
    borderLeftWidth: 3,
    borderLeftColor: color.amber,
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  noteText: { fontSize: size.label, color: color.inkSoft, lineHeight: 18 },

  empty: { alignItems: 'center', paddingVertical: 46, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 34, marginBottom: 12 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: weight.bold,
    color: color.ink,
    marginBottom: 5,
  },
  emptyDetail: {
    fontSize: size.bodySm,
    color: color.inkSoft,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 18,
  },
  emptyBtn: { alignSelf: 'stretch' },
});
