# Voya eSIM · API 契约

> 版本 v0.2 · 2026-08-31
> 客户端：**网站（Next.js）+ App（React Native / Expo）**
> 服务端：**TypeScript + NestJS + Postgres**（独立后端服务，非 Next.js 的服务端）
>
> 这份文档同时给后端、网站、App 三边看。后端照此实现，两个客户端照此对接。
> 字段一旦定稿就不要改名，改名的成本会同时落在三边。
>
> **v0.2 相对 v0.1 的四处破坏性变更**（详见 `esim-shop/docs/api-gap-analysis.md`）：
>
> 1. **目录数据改为返回多语言对象** `{en, zh}`，不再按 `Accept-Language` 返回单语言。
>    网站的语言切换是纯客户端零请求的，单语言方案会导致切换语言就要重拉全部数据。
> 2. **结算货币改为 USD 为主**（国际市场），金额单位是 cent：`1900` = $19.00。
> 3. **支持游客下单**（网页转化率考虑），新增 `order_token` 机制与游客订单认领。
> 4. **`region` 与 `filter` 拆成两个正交概念**，并补齐 oceania / middleeast / africa。

---

## 0. 先读这一节：四条约定

**一、金额一律用最小货币单位的整数。** USD 下 `1900` 表示 $19.00（cent）。
绝不用浮点数传金额，避免 `0.1 + 0.2` 那类问题在对账时炸出来。同时必带 `currency` 字段。

> ⚠️ **迁移注意：** 网站现有 mock 数据是 `priceUSD: 19`（以美元为单位）。
> 迁移到本契约必须 ×100。漏乘会让价格变成 1/100，而页面显示「$0.19」
> 只是看起来便宜，不会报错 —— 这类静默错误要靠断言兜住：
> 上线前校验目录里最低价 ≥ 100。

**二、所有价格计算在服务端完成。** 客户端不做汇率换算、不算折扣、不算税费。
客户端只负责把服务端返回的数字显示出来。这样多货币和促销规则只需维护一份。

**三、时间一律用 ISO 8601 带时区。** `2026-09-06T14:20:00+09:00`。
eSIM 业务天然跨时区，用户在东京看到的到期时间必须和服务端算的是同一刻。
客户端负责按设备本地时区渲染。

**四、多语言分两类处理，界线是「可缓存 vs 一次性」。**

| 类型 | 方案 | 理由 |
|---|---|---|
| 目录数据（目的地名、套餐名、tagline、地区名） | `{en, zh}` 多语言对象 | 会被 CDN / ISR 缓存；网站要零请求切换语言 |
| 错误 `message` | 按 `Accept-Language` 返回单语言 | 一次性响应、不缓存，多语言化纯属浪费 |
| 服务端算出的动态文案（「够用 7 天左右」） | 按 `Accept-Language` 返回单语言 | 依赖用户实时用量，本身不可缓存 |
| 运营商名（`networks`） | 不翻译，返回英文原文 | DOCOMO、SoftBank 是专有名 |

这条界线必须遵守，否则后端会在两种风格之间摇摆，最后两个客户端都要写兼容代码。

```ts
/** 目录类字段统一用这个形状 */
type LocalizedText = { en: string; zh: string };
```

---

## 1. 鉴权

与网站共用同一套账号体系。**同一个账号必须能同时登录网站和 App** —— 这是复用后端的
前提，也是用户在网站买的订单能在 App 里看到的原因。

### 1.0 匿名访问边界（v0.2 新增）

网站支持**游客下单** —— 不注册、只填邮箱就能买。这是网页转化率的关键
（Holafly、Airalo 都这么做）。因此不是所有接口都要求 `Authorization`：

| 接口 | 匿名 | 说明 |
|---|---|---|
| 目录全部（第 2 节） | ✅ | 公开数据，且要能被 CDN 缓存 |
| `POST /orders/quote` | ✅ | 试算不落库，但 `use_credit` 需登录 |
| `POST /orders` | ✅ | 必须传 `email`，返回 `order_token` |
| `GET /orders/{id}` | ✅ | 需带 `order_token` 校验 |
| `POST /esims/{id}/install-result` | ✅ | 需带 `order_token` |
| `GET /esims/{id}/activation` | ✅ | 需带 `order_token` |
| 其余全部 | ❌ | 需登录 |

**游客订单凭证 `order_token`：**

创建订单时返回。**不能只靠 `order_no` 查订单** —— `VY-8H2K41` 这种短号可枚举，
拿到就能看到别人的邮箱和 eSIM 激活码，是实打实的数据泄露。

```
order_token = HMAC-SHA256(secret, order_id + email + issued_at)
有效期 30 天，绑定订单 id 与邮箱
```

网站把它存 HttpOnly cookie（而不是放 URL —— URL 会进浏览器历史、
被分享、进 Referer 头）。查询时：

```
GET /api/v1/orders/ord_8H2K41
X-Order-Token: <token>
```

**游客订单认领：**

```
POST /api/v1/orders/claim
{ "email": "nicholas@example.com" }
```

同邮箱注册或登录后，把历史游客订单归入该账号。
**必须要求邮箱已验证** —— 否则填别人的邮箱就能盗走订单和 eSIM 激活码。

这一步是「网站买的卡能在 App 里看到」的实现基础，也是第 3.4 节
`channel` 字段的立意所在。

```
Authorization: Bearer <access_token>        # 匿名接口可省略
X-Client: voya-app-ios/1.0.0 (build 1)      # 或 voya-web/1.0.0
X-Device-Id: <设备唯一标识，用于风控与推送绑定>   # 网站可省略
X-Order-Token: <游客订单凭证>                 # 仅游客查单时
Accept-Language: zh-CN
X-Currency: USD
```

`Accept-Language` 影响**错误文案与动态文案**的语言（目录数据始终返回多语言对象，
见第 0 节第四条）。`X-Currency` 影响定价，不需要在每个接口单独传参数。

### 1.1 登录

```
POST /api/v1/auth/login
POST /api/v1/auth/social        # Apple / Google 登录，App 端优先
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

**注意：** iOS 端如果提供了第三方登录，App Store 审核要求必须同时提供
Apple 登录（Guideline 4.8）。这条经常被漏掉导致拒审。

响应：

```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "def502...",
  "expires_in": 3600,
  "user": {
    "id": "usr_8H2K41",
    "email": "nicholas@example.com",
    "display_name": "Nicholas",
    "referral_code": "NICHOLAS20",
    "credit_balance": 4000,
    "currency": "USD"
  }
}
```

`credit_balance` 是推荐返利余额，单位同样是最小货币单位（4000 = $40.00）。

---

## 2. 商品目录

对应 App 原型 **01 商店** / **02 目的地详情**，以及网站首页、`/destinations`、`/plan/[slug]`。
两个客户端共用同一套目录接口。

**这一节的接口全部允许匿名，且必须可缓存：**

```
Cache-Control: public, max-age=60, stale-while-revalidate=300
ETag: "<content-hash>"
```

网站用 Next 的 ISR 做增量静态再生，CDN 也依赖这两个头。没有 `ETag`
网站每次再生都要传全量 body。

**目录不分页。** 目的地是百级量级，分页只会让两个客户端都要写翻页逻辑
而收益为零。这条写在这里是为了避免后端自行发挥。

### 2.0 地区列表（v0.2 新增）

```
GET /api/v1/regions
```

```json
{
  "data": [
    { "key": "asia",       "name": { "en": "Asia", "zh": "亚洲" },        "destination_count": 7 },
    { "key": "europe",     "name": { "en": "Europe", "zh": "欧洲" },      "destination_count": 5 },
    { "key": "americas",   "name": { "en": "Americas", "zh": "美洲" },    "destination_count": 2 },
    { "key": "oceania",    "name": { "en": "Oceania", "zh": "大洋洲" },   "destination_count": 1 },
    { "key": "middleeast", "name": { "en": "Middle East", "zh": "中东" }, "destination_count": 2 },
    { "key": "africa",     "name": { "en": "Africa", "zh": "非洲" },      "destination_count": 0 }
  ]
}
```

网站首页的地区卡片显示「亚洲 · 7 个目的地」。**`destination_count` 必须由服务端给**，
否则首页为了算这个数字就得拉全量目录 —— 首页是最需要快的一屏。

### 2.1 目的地列表

```
GET /api/v1/destinations                      # 全部
GET /api/v1/destinations?filter=popular       # 热门
GET /api/v1/destinations?filter=region:asia   # 按地区
GET /api/v1/destinations?filter=multi         # 多国套餐
```

**v0.2 把 `region` 和 `filter` 拆成两个正交概念。** v0.1 的 `group` 枚举
把地理分类（asia）和展示筛选（popular、multi）塞在一起，且缺 oceania /
middleeast / africa —— 而现有目的地里就有澳大利亚、土耳其、阿联酋。

```ts
type Region = 'asia' | 'europe' | 'americas' | 'oceania' | 'middleeast' | 'africa';
type CatalogFilter = 'popular' | 'multi' | `region:${Region}`;
```

`region` 是每个目的地必有的数据属性；`filter` 只是查询参数。

```json
{
  "data": [
    {
      "slug": "japan",
      "name": { "en": "Japan", "zh": "日本" },
      "flag_emoji": "🇯🇵",
      "type": "country",
      "iso_code": "JP",
      "region": "asia",
      "from_price": 1900,
      "currency": "USD",
      "networks": ["NTT Docomo", "SoftBank"],
      "speed": "4G/5G",
      "is_popular": true,
      "tagline": {
        "en": "Stay online from Tokyo to Kyoto",
        "zh": "东京到京都，全程在线"
      }
    },
    {
      "slug": "global",
      "name": { "en": "Global 130+ Countries", "zh": "全球130+国家" },
      "flag_emoji": "🌐",
      "type": "region",
      "iso_code": null,
      "region": null,
      "from_price": 3900,
      "currency": "USD",
      "networks": ["Multi-carrier network"],
      "speed": "4G/5G",
      "country_count": 130,
      "tagline": {
        "en": "One eSIM, every border",
        "zh": "一张eSIM，跨越所有边境"
      }
    }
  ]
}
```

`type` 区分单国和多国套餐，客户端用它决定卡片渲染成网格块还是横向条目。
`type: 'region'` 时 `region` 字段为 `null`（多国套餐不属于单一地区）。

**`tagline` 对 country 和 region 都返回**（v0.1 只给 region 用）。
网站的目的地详情页 hero 每个国家都要用它。

### 2.2 构建期用的轻量 slug 列表（v0.2 新增）

```
GET /api/v1/destinations/slugs
```

```json
{
  "data": [
    { "slug": "japan", "updated_at": "2026-08-20T10:00:00+08:00" },
    { "slug": "global", "updated_at": "2026-08-18T09:00:00+08:00" }
  ]
}
```

网站的 `generateStaticParams()` 要在**构建期**拿到全部 slug 才能预渲染
`/plan/[slug]`。用这个接口而不是拉全量目录：几 KB vs 几百 KB，
构建速度差别明显。`updated_at` 供将来做按需再生用。

### 2.3 搜索目的地

```
GET /api/v1/destinations/search?q=日本
```

搜索需要同时匹配中文名、英文名、ISO 码和常见别名（"东京" 应该能搜到日本）。
**建议服务端做，不要让客户端拉全量列表在本地过滤** —— 目的地有上百个，
而且别名词典会变。

> 网站当前的实现是本地过滤 `DESTINATIONS`（只匹配中英文名和 slug），
> 接入后应改为调这个接口。本地过滤搜不到「东京」→ 日本这类别名。

响应结构同 2.1 的 `data` 数组。

### 2.4 某目的地的套餐列表

```
GET /api/v1/destinations/japan/plans
```

```json
{
  "destination": {
    "slug": "japan",
    "name": { "en": "Japan", "zh": "日本" },
    "flag_emoji": "🇯🇵",
    "region": "asia",
    "networks": ["NTT Docomo", "SoftBank"],
    "speed": "4G/5G",
    "supports_hotspot": true,
    "supports_voice": false,
    "activation_policy": "first_connection",
    "tagline": {
      "en": "Stay online from Tokyo to Kyoto",
      "zh": "东京到京都，全程在线"
    },
    "coverage_note": {
      "en": "Nationwide coverage, including Hokkaido and Okinawa",
      "zh": "全境覆盖，含北海道与冲绳"
    }
  },
  "plans": [
    {
      "id": "pln_jp_unl_7d",
      "data_amount_mb": null,
      "data_label": { "en": "Unlimited data", "zh": "无限流量" },
      "validity_days": 7,
      "price": 2700,
      "original_price": null,
      "currency": "USD",
      "unit_price_label": null,
      "is_unlimited": true,
      "daily_cap_mb": 2048,
      "daily_cap_note": {
        "en": "Throttled after 2GB per day",
        "zh": "每日 2GB 后降速"
      },
      "badge": "most_popular",
      "supports_topup": false
    },
    {
      "id": "pln_jp_5g_15d",
      "data_amount_mb": 5120,
      "data_label": { "en": "5 GB", "zh": "5 GB" },
      "validity_days": 15,
      "price": 5800,
      "original_price": null,
      "currency": "USD",
      "unit_price_label": { "en": "$1.16/GB", "zh": "$1.16/GB" },
      "is_unlimited": false,
      "daily_cap_mb": null,
      "badge": null,
      "supports_topup": true
    }
  ],
  "related_destinations": [
    {
      "slug": "south-korea",
      "name": { "en": "South Korea", "zh": "韩国" },
      "flag_emoji": "🇰🇷",
      "type": "country",
      "region": "asia",
      "from_price": 1900,
      "currency": "USD",
      "networks": ["SK Telecom", "KT"]
    }
  ]
}
```

几个字段解释一下为什么这么设计：

`activation_policy` 取 `first_connection` 或 `purchase`。这个字段直接决定客户端
显示「连网后开始计时」还是「购买后立即计时」。**这是客服工单最集中的争议点**，
必须由服务端明确告知，不能在客户端写死文案。

> ⚠️ 网站当前把「Starts when you connect, not at purchase」硬编码在 plan 页了，
> 接入时必须改成读这个字段。这正是本契约警告过的错误 —— 一旦某个目的地
> 的上游改成购买即计时，写死的文案就会变成客服事故。

`data_label` 和 `unit_price_label` 是服务端算好的展示字符串。因为「5120 MB」
要显示成「5 GB」还是「5120MB」涉及本地化习惯，让服务端统一处理比各客户端
自己算更可靠。注意它们现在是多语言对象 —— 数字部分两种语言常常相同，
但「无限流量 / Unlimited data」这类必须分开。

`badge` 取 `most_popular` / `best_value` / `null`。运营可以调，
**不要在客户端硬编码哪个套餐最热**（网站现在是 `popular?: boolean` 写在数据里，
迁移后改为读这个字段）。

`supports_topup` 决定详情页是否显示「加购流量」按钮。无限量套餐通常不支持加购。

`related_destinations`（v0.2 新增）是同地区的其他目的地，供详情页底部推荐用。
后端取同 `region` 的前 3-4 个。**放在这个响应里是为了让详情页只发一个请求** ——
否则客户端为了推荐几个国家就得拉全量目录。

### 2.5 设备兼容性检查

```
GET /api/v1/device/esim-support?model=iPhone15,3&os=ios&os_version=18.2
```

```json
{
  "supported": true,
  "reason": null,
  "help_url": "https://voyaesim.com/help/device-compatibility"
}
```

App 在结账前静默调一次。如果 `supported` 为 false，在结账页显示警告而不是直接拦住
（用户可能是给别人买）。

**网站不用这个接口。** 浏览器 UA 判断 eSIM 支持度非常不可靠
（同一个 UA 可能是支持 eSIM 的 iPhone 也可能不是），结账页放一句
「请确认设备支持 eSIM」+ 帮助链接更实在。

---

## 3. 订单与支付

对应 App 原型 **03 确认订单** / **04 支付成功**，以及网站 `/checkout`。

**支付渠道：Stripe**（国际市场 + USD）。Stripe 的 webhook、3DS、订阅生态最成熟，
文档和社区语料也最多。

### 3.1 试算（下单前）

```
POST /api/v1/orders/quote
```

允许匿名。但 `use_credit: true` 需要登录（返利余额属于账号）。

```json
{
  "items": [{ "plan_id": "pln_jp_unl_7d", "quantity": 1 }],
  "promo_code": "FIRST10",
  "use_credit": false
}
```

```json
{
  "subtotal": 2700,
  "discounts": [
    { "code": "FIRST10", "label": "优惠码 FIRST10", "amount": -270 }
  ],
  "credit_applied": 0,
  "tax": 0,
  "total": 2430,
  "currency": "USD",
  "promo_valid": true,
  "promo_error": null
}
```

`discounts[].label` 和 `promo_error` 按 `Accept-Language` 返回单语言 ——
它们是一次性响应，不缓存（见第 0 节第四条）。

**为什么要单独的试算接口：** 结账页用户可能反复改优惠码、切货币、勾选余额抵扣。
每次都创建订单会产生大量废弃订单。试算不落库，只算钱。

### 3.2 创建订单

```
POST /api/v1/orders
Idempotency-Key: <客户端生成的 UUID>
```

允许匿名（游客下单），此时 `email` 必填。

**`Idempotency-Key` 必须支持。** 移动网络下用户狂点支付按钮、或者请求超时重试，
不做幂等就会重复下单重复扣款。同一个 key 在 24 小时内重复请求，返回同一个订单。

```json
{
  "items": [{ "plan_id": "pln_jp_unl_7d", "quantity": 1 }],
  "promo_code": "FIRST10",
  "use_credit": false,
  "email": "nicholas@example.com",
  "payment_method": "card"
}
```

```json
{
  "order": {
    "id": "ord_8H2K41",
    "order_no": "VY-8H2K41",
    "status": "pending_payment",
    "total": 2430,
    "currency": "USD",
    "created_at": "2026-08-31T10:24:00+08:00",
    "expires_at": "2026-08-31T10:54:00+08:00"
  },
  "payment": {
    "provider": "stripe",
    "checkout_url": "https://pay.voyaesim.com/checkout/8h2k41?t=...",
    "return_url": "voyaesim://order/ord_8H2K41/result"
  },
  "order_token": "eyJ0eXAi..."
}
```

**`order_token`（v0.2 新增）** 是游客后续查单的凭证，见 1.0 节。
登录用户也会返回，但可以忽略 —— 他们靠 `Authorization` 就能查。

网站的 `return_url` 是普通 https 地址（`https://voyaesim.com/checkout/result?order=...`），
App 才用自定义 scheme。后端按 `X-Client` 判断，或让客户端在请求里显式传。

### 3.3 支付：网站用 Stripe Checkout，App 复用同一个页面

这是**复用价值最高、实现成本最低**的一块。App 不在应用内重做支付表单。

**网站：** 直接重定向到 `checkout_url`，支付完回到 `return_url`（普通 https）。

**App：**

```
App 拿到 checkout_url
  → 用 expo-web-browser 的 openAuthSessionAsync 打开
    （iOS 走 SFSafariViewController，Android 走 Chrome Custom Tabs）
  → 用户在网页里完成支付，含 3DS 验证
  → 网页重定向到 return_url（自定义 scheme）
  → 系统把 App 唤回前台，浏览器自动关闭
  → App 轮询订单状态确认结果
```

这样做的好处：PCI 合规范围不扩大到 App、3DS 银行跳转天然可用、
新增支付方式（PayPal、各地本地钱包）只改网站不发新版本。

**关键：不要相信 return_url 的参数。** 回跳只是「用户走完了流程」的信号，
不是「支付成功」的凭证。真实状态必须以服务端 webhook 为准，客户端回跳后
调 3.4 的接口确认。这条对网站同样成立 —— 别在 `?success=true` 上做业务判断。

**关于 IAP：** eSIM 流量套餐属于在 App 外消费的服务，按 App Store 规则
3.1.3(e)「Goods and Services Outside of the App」可以走自有支付，
不必接内购。Airalo、Holafly 都是这么做的。但商品描述里避免出现
「App 内解锁」「升级会员」这类措辞，否则审核可能按数字内容处理。

### 3.4 查询订单状态（回跳后轮询）

```
GET /api/v1/orders/ord_8H2K41
X-Order-Token: <游客必带>
```

```json
{
  "id": "ord_8H2K41",
  "order_no": "VY-8H2K41",
  "status": "completed",
  "paid_at": "2026-08-31T10:26:12+08:00",
  "total": 2430,
  "currency": "USD",
  "channel": "web",
  "is_guest": true,
  "email": "nicholas@example.com",
  "items": [
    {
      "plan_id": "pln_jp_unl_7d",
      "destination_name": { "en": "Japan", "zh": "日本" },
      "flag_emoji": "🇯🇵",
      "data_label": { "en": "Unlimited data", "zh": "无限流量" },
      "validity_days": 7,
      "esim_id": "esm_9F3L22"
    }
  ],
  "invoice_url": "https://voyaesim.com/invoice/8h2k41.pdf"
}
```

`destination_name` 和 `data_label` 是多语言对象 —— 订单详情页也要支持
零请求切换语言。

`is_guest`（v0.2 新增）标记这是游客订单。客户端据此显示「注册账号以便随时查看」
这类引导。

**订单状态机：**

```
pending_payment ──支付成功──> paid ──上游开卡成功──> completed
      │                        │
      │                        └──上游开卡失败──> provisioning_failed ──> refunded
      ├──超时未付──> expired
      └──用户取消──> cancelled
```

`paid` 和 `completed` 必须分开。支付成功不等于卡开好了 —— 上游供应商可能
库存不足或接口故障。App 在 `paid` 状态显示「正在开通」，只有 `completed`
才显示安装入口。落到 `provisioning_failed` 要自动退款并推送告知用户。

`channel` 字段标记订单来源（`app` / `web`），对应原型订单记录页里
「在网站购买」的标注，让用户确认两端数据是通的。

### 3.5 轮询策略

支付回跳后订单状态可能还没更新（webhook 有延迟）。建议：

```
第 1 次：立即
第 2-4 次：间隔 1s
第 5-8 次：间隔 2s
第 9 次起：间隔 5s，最多轮询 60s
```

超过 60s 仍是 `paid`，提示用户「开通中，好了会通知你」并依赖推送。
不要无限轮询，也不要在这时候显示失败 —— 大部分情况只是慢。

---

## 4. eSIM 管理（App 的核心价值）

对应原型 **09 我的 eSIM**、**10 流量详情**。这部分是用户装 App 的真正理由，
网站做不到或体验很差。

### 4.1 eSIM 列表

```
GET /api/v1/esims
```

```json
{
  "data": [
    {
      "id": "esm_9F3L22",
      "status": "active",
      "destination": {
        "name": { "en": "Japan", "zh": "日本" },
        "flag_emoji": "🇯🇵",
        "slug": "japan"
      },
      "network_name": "DOCOMO",
      "network_type": "5G",
      "data_total_mb": 5120,
      "data_used_mb": 3359,
      "data_remaining_mb": 1761,
      "data_remaining_label": "1.72 GB",
      "is_unlimited": false,
      "activated_at": "2026-08-23T14:20:00+09:00",
      "expires_at": "2026-09-06T14:20:00+09:00",
      "days_remaining": 6,
      "supports_topup": true,
      "usage_synced_at": "2026-08-31T10:15:00+08:00",
      "order_no": "VY-8H2K41"
    }
  ]
}
```

**eSIM 状态机** —— 这是整个 App 数据模型里最需要说清的部分：

```
provisioning     上游正在开卡，用户刚付完钱
    ↓
ready            开卡完成，可以安装了（原型「待安装」）
    ↓
installed        已装到设备，但还没连过当地网络
    ↓
active           已激活正在用（原型「使用中」）
    ↓
├─ depleted      流量用完，有效期内（可加购救回）
├─ expired       有效期到（原型「已到期」）
└─ suspended     被上游或风控暂停
```

`installed` 和 `active` 必须分开。用户在国内装好卡，落地前是 `installed`，
这时显示「未开始使用」而不是「使用中」，也不该开始倒计时。这个区分直接对应
原型里待安装卡片显示「连网后开始计时」。

`usage_synced_at` 告诉 App 余量数据是什么时候从上游同步的。**这个字段很重要**：
上游余量接口通常有分钟级延迟且有调用频率限制，App 需要显示「几分钟前更新」
让用户知道数字不是实时的，避免用户反复下拉刷新还投诉数据不准。

`data_remaining_label` 同样由服务端格式化，理由同 2.3。

### 4.2 强制刷新余量

```
POST /api/v1/esims/esm_9F3L22/refresh-usage
```

对应原型的下拉刷新。**服务端必须做节流** —— 上游接口按次计费或有频率限制，
建议同一张卡最短 60 秒才允许穿透到上游，期间返回缓存并带上 `usage_synced_at`。

```json
{
  "data_used_mb": 3359,
  "data_remaining_mb": 1761,
  "usage_synced_at": "2026-08-31T10:26:00+08:00",
  "throttled": false
}
```

`throttled: true` 表示这次没打上游，返回的是缓存。App 不用特别提示，
正常显示同步时间即可。

### 4.3 用量明细

```
GET /api/v1/esims/esm_9F3L22/usage?range=7d
```

```json
{
  "range": "7d",
  "unit": "mb",
  "points": [
    { "date": "2026-08-25", "used_mb": 120 },
    { "date": "2026-08-26", "used_mb": 480 },
    { "date": "2026-08-27", "used_mb": 890 },
    { "date": "2026-08-28", "used_mb": 320 },
    { "date": "2026-08-29", "used_mb": 640 },
    { "date": "2026-08-30", "used_mb": 410 },
    { "date": "2026-08-31", "used_mb": 180 }
  ],
  "daily_average_mb": 434,
  "projected_depletion_date": "2026-09-04",
  "depletes_before_expiry": true
}
```

`projected_depletion_date` 和 `depletes_before_expiry` 支撑原型里那句
「按这个用法约 4 天后用完，早于到期日」。**这两个字段是加购转化的关键** ——
它把「你还剩多少」变成「你快不够了」，这是旅途中用户最可能付钱的时刻。
放在服务端算是因为预测逻辑可能要调（比如排除异常峰值）。

### 4.4 安装凭证

```
GET /api/v1/esims/esm_9F3L22/activation
```

```json
{
  "smdp_address": "rsp.truphone.com",
  "activation_code": "K2-8H4M1P-9XQD7R-2LFB6V",
  "iccid": "89444770123456789 01",
  "lpa_string": "LPA:1$rsp.truphone.com$K2-8H4M1P-9XQD7R-2LFB6V",
  "qr_payload": "LPA:1$rsp.truphone.com$K2-8H4M1P-9XQD7R-2LFB6V",
  "install_count": 0,
  "max_installs": 1,
  "manual_steps_url": "https://voyaesim.com/help/manual-install"
}
```

`lpa_string` 是一键安装要用的完整字符串，格式是 `LPA:1$<SM-DP+>$<激活码>`。
原生模块直接吃这个。

`install_count` / `max_installs` 支撑原型帮助页里「删掉了还能重装吗」那条 ——
大部分套餐只能装一次，App 应该在用户点删除前警告。

**这个接口要能离线缓存。** 用户落地后可能完全没网，这时需要能看到二维码和手动
安装信息。建议 App 在订单完成时就把凭证存到本地（SecureStore），
并支持离线展示。

### 4.5 一键安装（必须原生）

这是 App 相对网站**唯一不可替代**的能力 —— 网页无法调起系统 eSIM 安装。

**iOS 侧：**

```swift
import CoreTelephony

let provisioning = CTCellularPlanProvisioning()
// 检查设备是否支持
guard provisioning.supportsCellularPlan() else { ... }

let request = CTCellularPlanProvisioningRequest()
request.address = smdpAddress          // rsp.truphone.com
request.matchingID = activationCode    // K2-8H4M1P-...
request.iccid = iccid                  // 可选
provisioning.addPlan(with: request) { result in
    // .unknown / .fail / .success / .cancel
}
```

**需要 entitlement：** `com.apple.CommercialCellularPlanProvisioning`
或 `com.apple.developer.coretelephony.sim-inserted`。
**这个权限要向 Apple 单独申请，审批要时间。** 越早申请越好，
不然代码写完了卡在权限上。在 Expo 里需要用 config plugin 注入 entitlement，
且必须走 EAS Build（Expo Go 用不了）。

**Android 侧：**

```kotlin
val intent = Intent(EuiccManager.ACTION_START_EUICC_ACTIVATION).apply {
    putExtra(EuiccManager.EXTRA_USE_QR_SCANNER, false)
    putExtra("com.android.phone.euicc.activation_code", lpaString)
}
// 或用 EuiccManager.downloadSubscription()（需系统级权限，普通应用用不了）
startActivityForResult(intent, REQ_ESIM)
```

Android 普通应用只能走 Intent 让系统接管，拿不到细粒度的安装进度。
所以原型里「安装中」那一屏在 Android 上其实是等 `onActivityResult`。

**Expo 集成方式：** 写一个 local Expo Module（`expo-module-create`），
暴露一个方法：

```ts
// modules/esim/index.ts
export type InstallResult = 'success' | 'cancelled' | 'failed' | 'unsupported';

export function isSupported(): Promise<boolean>;
export function installEsim(lpaString: string, label?: string): Promise<InstallResult>;
```

两端原生代码加起来约 150 行。这不需要第三方库，自己写比依赖个人维护的
薄封装更可控。

**安装结果要上报：**

```
POST /api/v1/esims/esm_9F3L22/install-result
{
  "result": "success",
  "platform": "ios",
  "os_version": "18.2",
  "device_model": "iPhone15,3",
  "error_code": null
}
```

服务端据此把 eSIM 状态推进到 `installed`，同时积累失败数据 ——
哪些机型/系统版本装不上，是优化安装引导的唯一依据。

---

## 5. 加购流量

对应原型 **11 加购流量**。这是 App 最高价值的复购入口。

### 5.1 可加购选项

```
GET /api/v1/esims/esm_9F3L22/topup-options
```

```json
{
  "current": {
    "data_remaining_mb": 1761,
    "data_remaining_label": "1.72 GB",
    "expires_at": "2026-09-06T14:20:00+09:00",
    "days_remaining": 6,
    "projected_depletion_date": "2026-09-04"
  },
  "data_options": [
    {
      "id": "top_jp_1g",
      "data_amount_mb": 1024,
      "data_label": { "en": "1 GB", "zh": "1 GB" },
      "price": 500,
      "currency": "USD",
      "estimated_days_label": "够用 2 天左右",
      "badge": null
    },
    {
      "id": "top_jp_3g",
      "data_amount_mb": 3072,
      "data_label": { "en": "3 GB", "zh": "3 GB" },
      "price": 1200,
      "currency": "USD",
      "estimated_days_label": "够用 7 天左右",
      "badge": "covers_trip"
    }
  ],
  "validity_options": [
    {
      "id": "ext_jp_7d",
      "extend_days": 7,
      "price": 400,
      "new_expires_at": "2026-09-13T14:20:00+09:00",
      "label": "延长 7 天"
    }
  ],
  "auto_topup": {
    "available": true,
    "enabled": false,
    "trigger_threshold_mb": 512,
    "topup_option_id": "top_jp_3g"
  }
}
```

`estimated_days_label` 基于该用户自己的日均用量算，不是通用估算 ——
这让「够用 7 天左右」这句话对用户真正有意义。

### 5.2 下加购单

```
POST /api/v1/esims/esm_9F3L22/topup
Idempotency-Key: <UUID>
```

```json
{
  "data_option_id": "top_jp_3g",
  "validity_option_id": null,
  "payment_method": "card"
}
```

响应结构同 3.2（返回订单 + checkout_url）。**加购不换卡不重装** ——
流量加到同一个 ICCID 上，用户无感。这一点要在 UI 上明确告知，
否则用户会担心要重新装一遍。

### 5.3 自动加购

```
PUT /api/v1/esims/esm_9F3L22/auto-topup
{
  "enabled": true,
  "trigger_threshold_mb": 512,
  "topup_option_id": "top_jp_3g",
  "payment_method_id": "pm_xxx"
}
```

自动加购需要预先保存的支付方式，且**必须让用户能一键关闭**。
自动扣款如果没有清晰的关闭入口，会招来投诉甚至审核问题。

---

## 6. 账户与订单

对应原型 **14 我的**、**15 订单记录**、**16 语言与货币**。

```
GET  /api/v1/me
PUT  /api/v1/me
GET  /api/v1/orders?page=1&per_page=20        # 含网站下的单
GET  /api/v1/orders/{id}/invoice              # 返回 PDF url
POST /api/v1/orders/{id}/resend-activation    # 重发安装码到邮箱
GET  /api/v1/payment-methods
POST /api/v1/payment-methods                  # 走网页 setup intent
DELETE /api/v1/payment-methods/{id}
GET  /api/v1/referral                         # 推荐码与返利记录
PUT  /api/v1/preferences                      # 语言、货币、通知开关
```

订单列表按月分组由 App 做（服务端返回平铺列表 + `created_at` 即可），
但**必须支持分页** —— 老用户可能有上百个订单。

---

## 7. 推送通知（必须原生）

网站做不到的另一件事。这是把「一次性交易」变成「持续关系」的关键。

```
POST /api/v1/push/register
{
  "token": "ExponentPushToken[xxx]",
  "platform": "ios",
  "device_id": "...",
  "locale": "zh-CN"
}
DELETE /api/v1/push/register    # 登出时调用
```

**必须做的推送类型：**

| 触发时机 | 文案方向 | 为什么 |
|---|---|---|
| 开卡完成 | 卡好了，出发前装上 | 承接支付后的空窗，降低忘记安装 |
| 流量剩 20% | 还剩 1GB，要加购吗 | 加购转化最高的时刻 |
| 流量用完 | 已用完，加购后立刻恢复 | 用户此时正断网着急 |
| 到期前 24h | 明天到期，需要续订吗 | 延长有效期的转化点 |
| 安装后 24h 未激活 | 落地记得打开数据漫游 | 砍掉大量「连不上网」工单 |

最后一条特别值得做。原型帮助页把「装好了但上不了网」放在第一位，
因为这是 eSIM 行业的头号客服负担，而它的根因通常只是没开数据漫游。
主动推送比等用户来问便宜得多。

**deep link 规范：**

```
voyaesim://esim/{id}          → 流量详情
voyaesim://esim/{id}/topup    → 加购页
voyaesim://order/{id}/result  → 支付回跳
voyaesim://store/{slug}       → 目的地详情
```

---

## 8. 错误响应

统一格式，App 才能统一处理：

```json
{
  "error": {
    "code": "plan_out_of_stock",
    "message": "这个套餐暂时售罄了，换一个吧",
    "field": null,
    "retryable": false
  }
}
```

`message` 必须是**可以直接显示给用户的话** —— 已按 `Accept-Language`
本地化，不带技术术语，且说明下一步怎么办。App 不该自己拼错误文案，
否则每加一个错误码就要发一次版本。

`retryable` 告诉 App 该不该显示「重试」按钮。

**关键错误码：**

| code | HTTP | 说明 |
|---|---|---|
| `unauthorized` | 401 | token 失效，走 refresh |
| `order_token_invalid` | 403 | 游客订单凭证无效或过期（v0.2） |
| `email_not_verified` | 403 | 认领游客订单需先验证邮箱（v0.2） |
| `plan_out_of_stock` | 409 | 上游库存不足 |
| `promo_invalid` | 422 | 优惠码无效或已用过 |
| `promo_expired` | 422 | 优惠码过期 |
| `order_expired` | 409 | 订单超时未付 |
| `payment_failed` | 402 | 支付被拒 |
| `provisioning_failed` | 500 | 上游开卡失败，需退款 |
| `esim_already_installed` | 409 | 超过 max_installs |
| `topup_not_supported` | 422 | 该套餐不支持加购 |
| `usage_sync_unavailable` | 503 | 上游余量接口故障，显示缓存 |
| `rate_limited` | 429 | 带 `Retry-After` 头 |

`usage_sync_unavailable` 要单独处理：**上游挂了不能让「我的 eSIM」整屏白掉**。
App 应显示缓存数据 + 一行「余量暂时无法更新」，其他信息照常可用。

---

## 9. 关键流程时序

### 9.1 购买到可用

```
App                    你的后端                 支付网关         eSIM 上游
 │                        │                       │                │
 ├─ POST /orders/quote ──>│                       │                │
 │<── 试算结果 ───────────┤                       │                │
 │                        │                       │                │
 ├─ POST /orders ────────>│                       │                │
 │   +Idempotency-Key     ├─ 创建 checkout ──────>│                │
 │<── order + url ────────┤<── checkout_url ──────┤                │
 │                        │                       │                │
 ├─ 打开网页支付 ─────────────────────────────────>│                │
 │   (SFSafariViewController)                     │                │
 │                        │<── webhook: paid ─────┤                │
 │                        │                       │                │
 │                        ├─ 请求开卡 ────────────────────────────>│
 │<─ deep link 回跳 ──────────────────────────────┤                │
 │                        │<── ICCID + 激活码 ─────────────────────┤
 ├─ GET /orders/{id} ────>│                       │                │
 │   (按 3.5 退避轮询)     │  status: completed    │                │
 │<── completed + esim ───┤                       │                │
 │                        ├─ 推送「卡好了」───────────────────────>│
 ├─ 一键安装（原生）        │                       │                │
 ├─ POST install-result ─>│                       │                │
```

**两个必须做对的地方：**

一、**开卡由 webhook 触发，不由 App 触发。** 用户可能在支付成功后立刻杀掉 App，
如果开卡依赖 App 调接口，这笔单就烂尾了 —— 钱收了卡没开。

二、**webhook 必须幂等。** 支付网关会重复投递（这是设计如此，不是 bug）。
用支付网关的 event id 做去重键，否则一笔订单会开出两张卡。

### 9.2 余量刷新与缓存

```
App 下拉刷新
  → POST /esims/{id}/refresh-usage
      → 服务端检查该卡上次同步时间
          < 60s：直接返回缓存，throttled: true
          ≥ 60s：调上游 → 更新缓存 → 返回，throttled: false
  → App 更新 UI，显示 usage_synced_at 的相对时间（「2 分钟前更新」）
```

另外建议服务端起定时任务，对 `active` 状态的卡每 15-30 分钟主动同步一次，
这样用户打开 App 时看到的数据不至于太旧，也能及时触发余量告警推送。

---

## 10. App 端缓存策略

Expo 端建议用 TanStack Query + AsyncStorage 持久化：

| 数据 | 缓存时长 | 离线可用 | 说明 |
|---|---|---|---|
| 目的地列表 | 24h | 是 | 变化极少 |
| 套餐列表 | 1h | 是 | 价格可能调 |
| eSIM 列表 | 2min | 是 | 打开即刷新 |
| 余量明细 | 5min | 是 | 配合手动刷新 |
| **安装凭证** | **永久** | **必须** | 落地无网时要能看 |
| 订单列表 | 10min | 是 | |

**安装凭证必须存 SecureStore 并永久保留**，理由在 4.4 说过 ——
用户落地后没网时需要看二维码。这是最容易漏、但漏了会挨骂的一条。

---

## 11. 上游供应商选型（待定，影响本契约）

你还没定上游，这会影响 4.1 和 4.3 的字段。主要候选：

**eSIM Access** — 中国团队，中文支持好，API 文档清晰，余量接口实时性不错。
适合起步，价格有竞争力。

**Maya Mobile** — 覆盖广，API 设计规范，有 sandbox 环境方便联调。
文档质量高。

**1GLOBAL（原 Truphone）** — 自有网络，稳定性最好，但通常有起量门槛，
适合规模上来之后。

**Airalo Partner** — 上手最快，但利润空间被压缩，且品牌感弱。

选型时重点看四件事：**余量接口的延迟和调用限制**（直接决定 4.2 的节流参数）、
**是否支持加购**（不支持的话第 5 节整节作废）、**开卡是同步还是异步**
（异步的话订单状态机要多一个中间态）、**沙箱环境是否完整**（没有 sandbox
联调会很痛苦）。

定下来之后我把 4.x 和 5.x 的字段对齐到具体供应商的返回结构。

---

## 12. 给后端的实现优先级

按客户端的阻塞顺序排，不是按业务重要性。**v0.2 调整了顺序** —— 因为网站支持
游客下单，网站不依赖 auth 就能完成完整购买闭环，`/auth/*` 因此后移。
这对「先用网站验证市场，App 随后跟上」是有利的顺序。

**第一批 · 网站能跑起来（也是 SEO 上线的前提）**
`GET /regions`、`GET /destinations`、`GET /destinations/slugs`、
`GET /destinations/{slug}/plans`、`GET /destinations/search`

做完这批，网站就能从 mock server 切到真后端，目录页可以上线做 SEO 收录。

**第二批 · 购买闭环（网站与 App 共用，做完网站就能卖货）**
`POST /orders/quote`、`POST /orders`（含游客）、`GET /orders/{id}`、
`order_token` 签名与校验、Stripe webhook、上游开卡

**第三批 · 账号体系（App 的前置依赖）**
`/auth/*`、`POST /orders/claim`（游客订单认领）、`GET /me`、`GET /orders` 列表

**第四批 · App 核心价值**
`GET /esims`、`/esims/{id}/activation`、`/esims/{id}/refresh-usage`、
`/esims/{id}/usage`、`/esims/{id}/install-result`

**第五批 · 复购与留存**
加购、`/push/register` 与推送触发、自动加购、发票、推荐返利

前两批做完网站就是一个能真实卖货的站。
前四批做完 App 就是一个能用的 MVP：能买、能装、能看余量。
第五批决定这个生意能不能挣到第二笔钱。

---

## 13. 与网站现有实现的差异清单

网站（`esim-shop`）当前是硬编码 mock 数据的前端，接入本契约时需要改这些地方。
完整分析见 `esim-shop/docs/api-gap-analysis.md`。

| 网站现状 | 改为 | 风险 |
|---|---|---|
| `priceUSD: 19`（美元） | `price: 1900`（cent） | **漏 ×100 不报错**，页面只是显示便宜 |
| `popular?: boolean` 写在数据里 | 读 `badge === 'most_popular'` | 低 |
| 「连网后开始计时」硬编码 | 读 `activation_policy` | 中，写死会变客服事故 |
| 搜索用本地 filter | 调 `/destinations/search` | 低，但本地搜不到别名 |
| `?plan=japan&days=7` | `?plan_id=pln_jp_unl_7d` | 低 |
| `region` 含 `global` 值 | `type: 'region'` + `region: null` | 低 |

**网站不实现的部分：** 第 4 节（eSIM 管理）、第 5 节（加购）、
第 7 节（推送）—— 一键安装和推送网页做不到，这正是 App 的存在理由。
网站后续最多做一个只读的「查看安装二维码」页，用 4.4 的 `activation` 接口即可。

**不进后端的部分：** `/faq` 和 `/how-it-works` 是营销内容，
放前端文案文件或将来接 CMS，不该占业务接口。
