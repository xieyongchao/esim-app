import { Platform } from 'react-native';

/**
 * 设计 token —— 与 HTML 原型 1:1 对应，改这里就能全局换皮。
 *
 * 配色刻意避开 Holafly 的品牌绿：复刻交互和信息架构是常规竞品做法，
 * 照搬品牌配色容易招麻烦。深海军蓝 + 航空琥珀，取自航空业视觉语言。
 */
export const color = {
  ink: '#101736',
  ink2: '#1D2650',
  inkSoft: '#4B5578',
  inkMute: '#8A92AE',

  paper: '#EFF1F6',
  card: '#FFFFFF',
  line: '#E1E5EF',

  amber: '#FFB020',
  amberDeep: '#B26A00',
  amberSoft: '#FFF3DC',

  teal: '#12A594',
  tealSoft: '#E4F6F3',
  tealText: '#0A7A6C',

  alert: '#E5484D',
  alertSoft: '#FDEDEE',
  alertText: '#B4262A',

  onInk: '#FFFFFF',
  onInkSoft: 'rgba(255,255,255,0.5)',
  onInkFaint: 'rgba(255,255,255,0.14)',
  onAmber: '#3A2400',
} as const;

/**
 * 等宽字体用于一切「机器可读凭证」：ICCID、激活码、流量计数、订单号、金额。
 * 这不是装饰 —— 等宽让数字纵向对齐，扫读余量和对比价格时明显更快。
 */
export const font = {
  ui: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;

export const size = {
  display: 44,
  h1: 27,
  h2: 21,
  h3: 17,
  body: 14,
  bodySm: 13,
  label: 11.5,
  caption: 10.5,
  micro: 9.5,
} as const;

export const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const radius = {
  sm: 6,
  md: 11,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
} as const;

/** 屏幕左右边距，全局统一 */
export const gutter = 20;

export const theme = { color, font, size, weight, radius, space, gutter } as const;
export type Theme = typeof theme;
