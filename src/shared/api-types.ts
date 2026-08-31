/**
 * API 类型 —— 与 docs/api-contract.md v0.2 严格对应。
 *
 * ⚠️ 这个文件刻意不 import 任何 React Native / Expo 的东西，也不依赖任何运行时代码。
 * 网站（Next.js）已经在用它的副本：`esim-shop/src/types/api.ts`。
 * 将来合成 monorepo 时搬到 packages/shared/src/api-types.ts 即可三端共用。
 * 字段只维护一处，避免各端慢慢漂移 —— 那种漂移最后都是靠线上 bug 发现的。
 *
 * 四条铁律（见契约文档第 0 节）：
 * 1. 金额一律最小货币单位整数：USD 下 1900 = $19.00（cent）。不用浮点数，避免对账时炸。
 * 2. 所有价格计算在服务端。客户端不算汇率、不算折扣、不算税。
 * 3. 时间一律 ISO 8601 带时区。eSIM 业务天然跨时区。
 * 4. 目录数据用 LocalizedText 多语言对象；错误与动态文案按 Accept-Language 返回单语言。
 */

/** 最小货币单位的整数金额。USD 下 1900 表示 $19.00 */
export type MinorAmount = number;

/** ISO 8601 带时区，如 2026-09-06T14:20:00+09:00 */
export type IsoDateTime = string;

/** ISO 日期，如 2026-09-04 */
export type IsoDate = string;

export type CurrencyCode = 'USD' | 'CNY' | 'EUR';
export type LocaleCode = 'en' | 'zh' | 'es' | 'ja';

/**
 * 目录类字段的多语言形状。
 *
 * 为什么目录数据要多语言而不按 Accept-Language 返回单语言：
 * 网站的语言切换是纯客户端零请求的（读 localStorage 直接重渲染）。
 * 若返回单语言，用户每次点「EN / 中文」都要重拉全部目录数据，
 * 且 SEO 需要按 locale 分别建路由和构建。
 *
 * 反之，错误文案和服务端算出的动态文案（「够用 7 天左右」）用普通 string，
 * 按 Accept-Language 返回 —— 它们是一次性响应、不缓存，多语言化纯属浪费。
 */
export interface LocalizedText {
  en: string;
  zh: string;
}

// ─────────────────────────── 鉴权 ───────────────────────────

export interface User {
  id: string;
  email: string;
  display_name: string;
  referral_code: string;
  /** 推荐返利余额，最小货币单位 */
  credit_balance: MinorAmount;
  currency: CurrencyCode;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

// ─────────────────────────── 商品目录 ───────────────────────────

export type DestinationType = 'country' | 'region';

/** 地理区域 —— 每个 country 类目的地必有一个 */
export type Region =
  | 'asia'
  | 'europe'
  | 'americas'
  | 'oceania'
  | 'middleeast'
  | 'africa';

/**
 * 目录查询筛选。与 Region 正交 —— v0.1 曾把两者塞进同一个枚举，
 * 导致「popular」和「asia」这两种不同性质的东西混在一起，且缺 oceania /
 * middleeast / africa（而现有目的地里就有澳大利亚、土耳其、阿联酋）。
 */
export type CatalogFilter = 'popular' | 'multi' | `region:${Region}`;

export interface RegionInfo {
  key: Region;
  name: LocalizedText;
  /** 由服务端给，否则首页为了算这个数字就得拉全量目录 */
  destination_count: number;
}

export interface Destination {
  slug: string;
  name: LocalizedText;
  flag_emoji: string;
  type: DestinationType;
  iso_code: string | null;
  /** type === 'region'（多国套餐）时为 null */
  region: Region | null;
  from_price: MinorAmount;
  currency: CurrencyCode;
  /** 运营商专有名，不翻译 */
  networks?: string[];
  speed?: string;
  is_popular?: boolean;
  /** 仅 type === 'region' */
  country_count?: number;
  /** v0.2：country 和 region 都可返回（v0.1 只给 region） */
  tagline?: LocalizedText;
}

/** 构建期用的轻量列表，供 Next 的 generateStaticParams() 用 */
export interface DestinationSlug {
  slug: string;
  updated_at: IsoDateTime;
}

/**
 * 有效期计时起点。直接决定客户端显示「连网后开始计时」还是「购买后立即计时」。
 * 这是 eSIM 客服工单最集中的争议点，必须由服务端明确告知，不能在客户端写死。
 */
export type ActivationPolicy = 'first_connection' | 'purchase';

export interface DestinationDetail {
  slug: string;
  name: LocalizedText;
  flag_emoji: string;
  region: Region | null;
  networks: string[];
  speed: string;
  supports_hotspot: boolean;
  supports_voice: boolean;
  activation_policy: ActivationPolicy;
  tagline: LocalizedText | null;
  coverage_note: LocalizedText | null;
}

export type PlanBadge = 'most_popular' | 'best_value' | null;

export interface Plan {
  id: string;
  /** 无限量套餐为 null */
  data_amount_mb: number | null;
  /** 服务端格式化好的展示串，如 "5 GB"。本地化习惯差异让服务端统一处理更可靠 */
  data_label: LocalizedText;
  validity_days: number;
  price: MinorAmount;
  original_price: MinorAmount | null;
  currency: CurrencyCode;
  unit_price_label: LocalizedText | null;
  is_unlimited: boolean;
  daily_cap_mb: number | null;
  daily_cap_note?: LocalizedText;
  /** 运营可调，不要在客户端硬编码哪个套餐最热 */
  badge: PlanBadge;
  supports_topup: boolean;
}

export interface PlansResponse {
  destination: DestinationDetail;
  plans: Plan[];
  /** 同地区其他目的地，供详情页底部推荐。放在这里是为了让详情页只发一个请求 */
  related_destinations: Destination[];
}

export interface DeviceSupportResponse {
  supported: boolean;
  reason: string | null;
  help_url: string;
}

// ─────────────────────────── 订单与支付 ───────────────────────────

export interface QuoteDiscount {
  code: string;
  label: string;
  /** 负数 */
  amount: MinorAmount;
}

export interface QuoteResponse {
  subtotal: MinorAmount;
  discounts: QuoteDiscount[];
  credit_applied: MinorAmount;
  tax: MinorAmount;
  total: MinorAmount;
  currency: CurrencyCode;
  promo_valid: boolean;
  promo_error: string | null;
}

/**
 * paid 和 completed 必须分开：支付成功 ≠ 卡开好了。
 * 上游可能库存不足或接口故障。App 在 paid 显示「正在开通」，
 * 只有 completed 才显示安装入口。
 */
export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'completed'
  | 'provisioning_failed'
  | 'refunded'
  | 'expired'
  | 'cancelled';

export type PaymentMethodKind = 'card' | 'apple_pay' | 'google_pay' | 'paypal';

/** 订单来源。对应订单记录页「在网站购买」的标注，让用户确认两端数据是通的 */
export type OrderChannel = 'app' | 'web';

export interface OrderItem {
  plan_id: string;
  destination_name: LocalizedText;
  flag_emoji: string;
  data_label: LocalizedText;
  validity_days: number;
  /** 开卡完成后才有 */
  esim_id: string | null;
}

export interface Order {
  id: string;
  order_no: string;
  status: OrderStatus;
  total: MinorAmount;
  currency: CurrencyCode;
  channel: OrderChannel;
  /** v0.2：游客订单。客户端据此显示「注册以便随时查看」引导 */
  is_guest: boolean;
  email: string;
  created_at: IsoDateTime;
  paid_at?: IsoDateTime;
  expires_at?: IsoDateTime;
  items: OrderItem[];
  invoice_url?: string;
}

export interface PaymentIntent {
  provider: string;
  /** App 用 expo-web-browser 打开；网站直接重定向 */
  checkout_url: string;
  /** App 是自定义 scheme，网站是普通 https 地址 */
  return_url: string;
}

export interface CreateOrderResponse {
  order: Order;
  payment: PaymentIntent;
  /**
   * v0.2：游客查单凭证，HMAC 签名、绑定订单 id 与邮箱、30 天有效。
   *
   * 为什么不能只靠 order_no 查单：VY-8H2K41 这种短号可枚举，
   * 拿到就能看别人的邮箱和 eSIM 激活码 —— 是实打实的数据泄露。
   * 网站应存 HttpOnly cookie，不要放 URL（URL 会进浏览器历史、
   * 被分享、进 Referer 头）。
   */
  order_token: string;
}

// ─────────────────────────── eSIM ───────────────────────────

/**
 * eSIM 生命周期。
 *
 * installed 和 active 必须分开：用户在国内装好卡、落地前是 installed，
 * 这时显示「未开始使用」而不是「使用中」，也不该开始倒计时。
 * 混在一起会导致用户投诉有效期被偷走。
 */
export type EsimStatus =
  | 'provisioning'
  | 'ready'
  | 'installed'
  | 'active'
  | 'depleted'
  | 'expired'
  | 'suspended';

export interface EsimDestinationRef {
  name: LocalizedText;
  flag_emoji: string;
  slug: string;
}

export interface Esim {
  id: string;
  status: EsimStatus;
  destination: EsimDestinationRef;
  network_name: string;
  network_type: string;
  /** 无限量为 null */
  data_total_mb: number | null;
  data_used_mb: number;
  data_remaining_mb: number | null;
  data_remaining_label: string;
  is_unlimited: boolean;
  /** 未激活时为 null */
  activated_at: IsoDateTime | null;
  expires_at: IsoDateTime | null;
  days_remaining: number | null;
  supports_topup: boolean;
  /**
   * 余量数据的同步时刻。上游余量接口通常有分钟级延迟且有频率限制，
   * App 需显示「几分钟前更新」让用户知道数字不是实时的，
   * 避免用户反复下拉刷新还投诉数据不准。
   */
  usage_synced_at: IsoDateTime;
  order_no: string;
}

export interface RefreshUsageResponse {
  data_used_mb: number;
  data_remaining_mb: number | null;
  usage_synced_at: IsoDateTime;
  /** true 表示这次没打上游，返回的是缓存。App 无需特别提示 */
  throttled: boolean;
}

export interface UsagePoint {
  date: IsoDate;
  used_mb: number;
}

export interface UsageResponse {
  range: '7d' | '30d';
  unit: 'mb';
  points: UsagePoint[];
  daily_average_mb: number;
  /**
   * 这两个字段是加购转化的关键：把「你还剩多少」变成「你快不够了」，
   * 这是旅途中用户最可能付钱的时刻。
   */
  projected_depletion_date: IsoDate | null;
  depletes_before_expiry: boolean;
}

export interface ActivationCredentials {
  smdp_address: string;
  activation_code: string;
  iccid: string;
  /** 一键安装吃这个，格式 LPA:1$<SM-DP+>$<激活码> */
  lpa_string: string;
  qr_payload: string;
  install_count: number;
  max_installs: number;
  manual_steps_url: string;
}

export type InstallResult = 'success' | 'cancelled' | 'failed' | 'unsupported';

export interface InstallResultReport {
  result: InstallResult;
  platform: 'ios' | 'android';
  os_version: string;
  device_model: string;
  error_code: string | null;
}

// ─────────────────────────── 加购 ───────────────────────────

export interface TopupCurrent {
  data_remaining_mb: number | null;
  data_remaining_label: string;
  expires_at: IsoDateTime | null;
  days_remaining: number | null;
  projected_depletion_date: IsoDate | null;
}

export interface TopupDataOption {
  id: string;
  data_amount_mb: number;
  data_label: LocalizedText;
  price: MinorAmount;
  currency: CurrencyCode;
  /**
   * 基于该用户自己的日均用量算，不是通用估算。
   * 依赖实时用量所以不可缓存 —— 按 Accept-Language 返回单语言。
   */
  estimated_days_label: string;
  badge: 'covers_trip' | null;
}

export interface TopupValidityOption {
  id: string;
  extend_days: number;
  price: MinorAmount;
  new_expires_at: IsoDateTime;
  label: string;
}

export interface AutoTopupConfig {
  available: boolean;
  enabled: boolean;
  trigger_threshold_mb: number;
  topup_option_id: string | null;
}

export interface TopupOptionsResponse {
  current: TopupCurrent;
  data_options: TopupDataOption[];
  validity_options: TopupValidityOption[];
  auto_topup: AutoTopupConfig;
}

// ─────────────────────────── 账户 ───────────────────────────

export interface SavedPaymentMethod {
  id: string;
  kind: PaymentMethodKind;
  label: string;
  brand: string | null;
  last4: string | null;
  is_default: boolean;
}

export interface Preferences {
  locale: LocaleCode;
  currency: CurrencyCode;
  notify_low_data: boolean;
  notify_expiry: boolean;
  notify_promo: boolean;
}

export interface ReferralInfo {
  code: string;
  reward_per_invite: MinorAmount;
  friend_discount: MinorAmount;
  currency: CurrencyCode;
  total_earned: MinorAmount;
  invited_count: number;
  share_url: string;
}

// ─────────────────────────── 错误 ───────────────────────────

export type ApiErrorCode =
  | 'unauthorized'
  | 'order_token_invalid'
  | 'email_not_verified'
  | 'plan_out_of_stock'
  | 'promo_invalid'
  | 'promo_expired'
  | 'order_expired'
  | 'payment_failed'
  | 'provisioning_failed'
  | 'esim_already_installed'
  | 'topup_not_supported'
  | 'usage_sync_unavailable'
  | 'rate_limited'
  | 'not_found'
  | 'network_error';

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    /** 已按 Accept-Language 本地化，可直接显示给用户。App 不该自己拼错误文案 */
    message: string;
    field: string | null;
    retryable: boolean;
  };
}

export interface Paginated<T> {
  data: T[];
  page: number;
  per_page: number;
  total: number;
  has_more: boolean;
}

/**
 * 目录类接口的包装。目录不分页 —— 目的地是百级量级，
 * 分页只会让各客户端都要写翻页逻辑而收益为零。
 */
export interface Listed<T> {
  data: T[];
}
