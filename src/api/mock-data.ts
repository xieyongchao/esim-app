import type {
  ActivationCredentials,
  Destination,
  Esim,
  LocalizedText,
  Order,
  PlansResponse,
  Preferences,
  QuoteResponse,
  ReferralInfo,
  RegionInfo,
  TopupOptionsResponse,
  UsageResponse,
  User,
} from '@shared/api-types';

/**
 * Mock 数据 —— 字段与 docs/api-contract.md 完全一致。
 * 接真实接口时只需把 src/api/client.ts 的 USE_MOCK 关掉，页面代码一行不用改。
 *
 * 数据刻意造得「有故事」：日本卡快用完了且早于到期日，正好演示加购转化路径。
 *
 * 目录字段用 L() 包成 LocalizedText 而不是裸 string —— 这是契约要求的形状，
 * mock 偷懒写成 string 的话，等接真接口时才会发现所有页面都渲染不出来。
 */

const now = new Date('2026-08-31T10:26:00+08:00');

/** LocalizedText 构造糖，省掉满屏的 { en: '…', zh: '…' } */
const L = (zh: string, en: string): LocalizedText => ({ zh, en });

export const mockUser: User = {
  id: 'usr_8H2K41',
  email: 'nicholas@example.com',
  display_name: 'Nicholas',
  referral_code: 'NICHOLAS20',
  credit_balance: 4000,
  currency: 'CNY',
};

export const mockDestinations: Destination[] = [
  { slug: 'japan', name: L('日本', 'Japan'), flag_emoji: '🇯🇵', type: 'country', iso_code: 'JP', region: 'asia', from_price: 3900, currency: 'CNY', networks: ['DOCOMO', 'SoftBank'], is_popular: true },
  { slug: 'korea', name: L('韩国', 'South Korea'), flag_emoji: '🇰🇷', type: 'country', iso_code: 'KR', region: 'asia', from_price: 3500, currency: 'CNY', networks: ['KT', 'SKT'], is_popular: true },
  { slug: 'thailand', name: L('泰国', 'Thailand'), flag_emoji: '🇹🇭', type: 'country', iso_code: 'TH', region: 'asia', from_price: 2900, currency: 'CNY', networks: ['AIS'], is_popular: true },
  { slug: 'usa', name: L('美国', 'United States'), flag_emoji: '🇺🇸', type: 'country', iso_code: 'US', region: 'americas', from_price: 4500, currency: 'CNY', networks: ['T-Mobile'], is_popular: true },
  { slug: 'singapore', name: L('新加坡', 'Singapore'), flag_emoji: '🇸🇬', type: 'country', iso_code: 'SG', region: 'asia', from_price: 3200, currency: 'CNY', networks: ['Singtel'], is_popular: true },
  { slug: 'australia', name: L('澳大利亚', 'Australia'), flag_emoji: '🇦🇺', type: 'country', iso_code: 'AU', region: 'oceania', from_price: 5200, currency: 'CNY', networks: ['Telstra'], is_popular: true },
  { slug: 'france', name: L('法国', 'France'), flag_emoji: '🇫🇷', type: 'country', iso_code: 'FR', region: 'europe', from_price: 4200, currency: 'CNY', networks: ['Orange'] },
  { slug: 'italy', name: L('意大利', 'Italy'), flag_emoji: '🇮🇹', type: 'country', iso_code: 'IT', region: 'europe', from_price: 4200, currency: 'CNY', networks: ['TIM'] },
  { slug: 'uae', name: L('阿联酋', 'UAE'), flag_emoji: '🇦🇪', type: 'country', iso_code: 'AE', region: 'middleeast', from_price: 6800, currency: 'CNY', networks: ['Etisalat'] },
];

export const mockRegions: Destination[] = [
  { slug: 'europe-39', name: L('欧洲 39 国', 'Europe 39 Countries'), flag_emoji: '🌍', type: 'region', iso_code: null, region: null, from_price: 8800, currency: 'CNY', country_count: 39, tagline: L('一张卡覆盖申根全境，跨境不断网', 'One eSIM across Schengen, no gaps at borders') },
  { slug: 'asia-14', name: L('亚洲 14 国', 'Asia 14 Countries'), flag_emoji: '🌏', type: 'region', iso_code: null, region: null, from_price: 7600, currency: 'CNY', country_count: 14, tagline: L('日韩泰新马越等，适合连游多国', 'Japan, Korea, Thailand and more — built for multi-stop trips') },
];

/**
 * 地区元信息。destination_count 由服务端给：
 * 首页若要自己算这个数字，就得先拉全量目录，而它只想显示一排筛选器。
 */
export const mockRegionInfos: RegionInfo[] = [
  { key: 'asia', name: L('亚洲', 'Asia'), destination_count: 14 },
  { key: 'europe', name: L('欧洲', 'Europe'), destination_count: 39 },
  { key: 'americas', name: L('美洲', 'Americas'), destination_count: 12 },
  { key: 'oceania', name: L('大洋洲', 'Oceania'), destination_count: 4 },
  { key: 'middleeast', name: L('中东', 'Middle East'), destination_count: 8 },
  { key: 'africa', name: L('非洲', 'Africa'), destination_count: 6 },
];

export const mockPlans: PlansResponse = {
  destination: {
    slug: 'japan',
    name: L('日本', 'Japan'),
    flag_emoji: '🇯🇵',
    region: 'asia',
    networks: ['DOCOMO', 'SoftBank'],
    speed: '5G / 4G LTE',
    supports_hotspot: true,
    supports_voice: false,
    activation_policy: 'first_connection',
    tagline: null,
    coverage_note: L('全境覆盖，含北海道与冲绳', 'Nationwide coverage including Hokkaido and Okinawa'),
  },
  plans: [
    { id: 'pln_jp_3g_8d', data_amount_mb: 3072, data_label: L('3 GB', '3 GB'), validity_days: 8, price: 3900, original_price: null, currency: 'CNY', unit_price_label: L('¥13/GB', '¥13/GB'), is_unlimited: false, daily_cap_mb: null, badge: null, supports_topup: true },
    { id: 'pln_jp_5g_15d', data_amount_mb: 5120, data_label: L('5 GB', '5 GB'), validity_days: 15, price: 5800, original_price: null, currency: 'CNY', unit_price_label: L('¥11.6/GB', '¥11.6/GB'), is_unlimited: false, daily_cap_mb: null, badge: 'most_popular', supports_topup: true },
    { id: 'pln_jp_10g_30d', data_amount_mb: 10240, data_label: L('10 GB', '10 GB'), validity_days: 30, price: 9800, original_price: null, currency: 'CNY', unit_price_label: L('¥9.8/GB', '¥9.8/GB'), is_unlimited: false, daily_cap_mb: null, badge: null, supports_topup: true },
    { id: 'pln_jp_20g_30d', data_amount_mb: 20480, data_label: L('20 GB', '20 GB'), validity_days: 30, price: 15800, original_price: null, currency: 'CNY', unit_price_label: L('¥7.9/GB', '¥7.9/GB'), is_unlimited: false, daily_cap_mb: null, badge: 'best_value', supports_topup: true },
    { id: 'pln_jp_unl_15d', data_amount_mb: null, data_label: L('无限量', 'Unlimited'), validity_days: 15, price: 22800, original_price: null, currency: 'CNY', unit_price_label: L('每天 ¥15.2', '¥15.2/day'), is_unlimited: true, daily_cap_mb: 2048, daily_cap_note: L('每日 2GB 后降速', 'Throttled after 2GB per day'), badge: null, supports_topup: false },
  ],
  related_destinations: [],
};

export const mockEsims: Esim[] = [
  {
    id: 'esm_9F3L22',
    status: 'active',
    destination: { name: L('日本', 'Japan'), flag_emoji: '🇯🇵', slug: 'japan' },
    network_name: 'DOCOMO',
    network_type: '5G',
    data_total_mb: 5120,
    data_used_mb: 3359,
    data_remaining_mb: 1761,
    data_remaining_label: '1.72 GB',
    is_unlimited: false,
    activated_at: '2026-08-23T14:20:00+09:00',
    expires_at: '2026-09-06T14:20:00+09:00',
    days_remaining: 6,
    supports_topup: true,
    usage_synced_at: '2026-08-31T10:15:00+08:00',
    order_no: 'VY-8H2K41',
  },
  {
    // 已装但未连过当地网络 —— 这就是 installed 和 active 必须分开的原因
    id: 'esm_7K1M08',
    status: 'ready',
    destination: { name: L('韩国', 'South Korea'), flag_emoji: '🇰🇷', slug: 'korea' },
    network_name: 'KT',
    network_type: '5G',
    data_total_mb: 3072,
    data_used_mb: 0,
    data_remaining_mb: 3072,
    data_remaining_label: '3 GB',
    is_unlimited: false,
    activated_at: null,
    expires_at: null,
    days_remaining: null,
    supports_topup: true,
    usage_synced_at: '2026-08-31T10:15:00+08:00',
    order_no: 'VY-8H2K40',
  },
  {
    id: 'esm_5C9P22',
    status: 'expired',
    destination: { name: L('泰国', 'Thailand'), flag_emoji: '🇹🇭', slug: 'thailand' },
    network_name: 'AIS',
    network_type: '4G',
    data_total_mb: 5120,
    data_used_mb: 5120,
    data_remaining_mb: 0,
    data_remaining_label: '0 GB',
    is_unlimited: false,
    activated_at: '2026-08-02T11:00:00+07:00',
    expires_at: '2026-08-12T11:00:00+07:00',
    days_remaining: 0,
    supports_topup: false,
    usage_synced_at: '2026-08-12T11:00:00+07:00',
    order_no: 'VY-7C9P22',
  },
];

export const mockUsage: UsageResponse = {
  range: '7d',
  unit: 'mb',
  points: [
    { date: '2026-08-25', used_mb: 120 },
    { date: '2026-08-26', used_mb: 480 },
    { date: '2026-08-27', used_mb: 890 },
    { date: '2026-08-28', used_mb: 320 },
    { date: '2026-08-29', used_mb: 640 },
    { date: '2026-08-30', used_mb: 410 },
    { date: '2026-08-31', used_mb: 180 },
  ],
  daily_average_mb: 434,
  projected_depletion_date: '2026-09-04',
  depletes_before_expiry: true,
};

export const mockActivation: ActivationCredentials = {
  smdp_address: 'rsp.truphone.com',
  activation_code: 'K2-8H4M1P-9XQD7R-2LFB6V',
  iccid: '89444770123456789 01',
  lpa_string: 'LPA:1$rsp.truphone.com$K2-8H4M1P-9XQD7R-2LFB6V',
  qr_payload: 'LPA:1$rsp.truphone.com$K2-8H4M1P-9XQD7R-2LFB6V',
  install_count: 0,
  max_installs: 1,
  manual_steps_url: 'https://voyaesim.com/help/manual-install',
};

export const mockQuote: QuoteResponse = {
  subtotal: 5800,
  discounts: [{ code: 'FIRST10', label: '优惠码 FIRST10', amount: -580 }],
  credit_applied: 0,
  tax: 0,
  total: 5220,
  currency: 'CNY',
  promo_valid: true,
  promo_error: null,
};

export const mockTopup: TopupOptionsResponse = {
  current: {
    data_remaining_mb: 1761,
    data_remaining_label: '1.72 GB',
    expires_at: '2026-09-06T14:20:00+09:00',
    days_remaining: 6,
    projected_depletion_date: '2026-09-04',
  },
  data_options: [
    { id: 'top_jp_1g', data_amount_mb: 1024, data_label: L('1 GB', '1 GB'), price: 1500, currency: 'CNY', estimated_days_label: '够用 2 天左右', badge: null },
    { id: 'top_jp_3g', data_amount_mb: 3072, data_label: L('3 GB', '3 GB'), price: 3600, currency: 'CNY', estimated_days_label: '够用 7 天左右', badge: 'covers_trip' },
    { id: 'top_jp_5g', data_amount_mb: 5120, data_label: L('5 GB', '5 GB'), price: 5500, currency: 'CNY', estimated_days_label: '够用 11 天左右', badge: null },
  ],
  validity_options: [
    { id: 'ext_jp_7d', extend_days: 7, price: 1200, new_expires_at: '2026-09-13T14:20:00+09:00', label: '延长 7 天' },
  ],
  auto_topup: {
    available: true,
    enabled: false,
    trigger_threshold_mb: 512,
    topup_option_id: 'top_jp_3g',
  },
};

export const mockOrders: Order[] = [
  {
    id: 'ord_8H2K41', order_no: 'VY-8H2K41', status: 'completed', total: 5220, currency: 'CNY',
    channel: 'app', is_guest: false, email: 'nicholas@example.com',
    created_at: '2026-08-23T14:00:00+08:00', paid_at: '2026-08-23T14:02:00+08:00',
    items: [{ plan_id: 'pln_jp_5g_15d', destination_name: L('日本', 'Japan'), flag_emoji: '🇯🇵', data_label: L('5 GB', '5 GB'), validity_days: 15, esim_id: 'esm_9F3L22' }],
    invoice_url: 'https://voyaesim.com/invoice/8h2k41.pdf',
  },
  {
    id: 'ord_8H2K40', order_no: 'VY-8H2K40', status: 'completed', total: 3500, currency: 'CNY',
    channel: 'app', is_guest: false, email: 'nicholas@example.com',
    created_at: '2026-08-23T13:50:00+08:00', paid_at: '2026-08-23T13:51:00+08:00',
    items: [{ plan_id: 'pln_kr_3g_8d', destination_name: L('韩国', 'South Korea'), flag_emoji: '🇰🇷', data_label: L('3 GB', '3 GB'), validity_days: 8, esim_id: 'esm_7K1M08' }],
  },
  {
    // channel: 'web' —— 在网站买的订单 App 里也能看到，因为共用同一套账号和订单数据
    id: 'ord_7C9P22', order_no: 'VY-7C9P22', status: 'completed', total: 4500, currency: 'CNY',
    channel: 'web', is_guest: false, email: 'nicholas@example.com',
    created_at: '2026-08-02T09:30:00+08:00', paid_at: '2026-08-02T09:31:00+08:00',
    items: [{ plan_id: 'pln_th_5g_10d', destination_name: L('泰国', 'Thailand'), flag_emoji: '🇹🇭', data_label: L('5 GB', '5 GB'), validity_days: 10, esim_id: 'esm_5C9P22' }],
  },
  {
    // 游客订单：在网站没登录就买了。App 里凭邮箱认领后可见，
    // 界面上要显示「注册以便随时查看」的引导 —— is_guest 就是为这个存在的
    id: 'ord_6A1L08', order_no: 'VY-6A1L08', status: 'completed', total: 12800, currency: 'CNY',
    channel: 'web', is_guest: true, email: 'nicholas@example.com',
    created_at: '2026-06-14T20:10:00+08:00', paid_at: '2026-06-14T20:11:00+08:00',
    items: [{ plan_id: 'pln_eu_10g_30d', destination_name: L('欧洲 39 国', 'Europe 39 Countries'), flag_emoji: '🌍', data_label: L('10 GB', '10 GB'), validity_days: 30, esim_id: 'esm_3E7N44' }],
  },
];

export const mockPreferences: Preferences = {
  locale: 'zh',
  currency: 'CNY',
  notify_low_data: true,
  notify_expiry: true,
  notify_promo: false,
};

export const mockReferral: ReferralInfo = {
  code: 'NICHOLAS20',
  reward_per_invite: 2000,
  friend_discount: 2000,
  currency: 'CNY',
  total_earned: 4000,
  invited_count: 2,
  share_url: 'https://voyaesim.com/r/NICHOLAS20',
};

export const mockNow = now;
