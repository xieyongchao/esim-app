# 交接文档 — Voya eSIM App

> 记录做到哪、为什么这么做、下一步做什么。换任何 AI 工具或换人接手都从这里开始。
> 最后更新：2026-09-01

---

## 1. 项目定位与最初的那个问题

用户已有一个 eSIM 售卖网站（`esim-shop`，Next.js 16），想要一个类似 Holafly 的
配套 App。提出的核心问题是：

> 「App 我理解主要是管理购买 eSIM 套餐余额和订阅等功能，购买功能跟网站有一些
> 重合，是否可以复用？还是要重新开发一套呢？」

**结论：分三层，不是简单的「复用」或「重做」。**

| 层 | 决定 | 理由 |
|---|---|---|
| 后端业务逻辑 | **完全复用** | 目录、订单、优惠券、税、对账只该有一套。两套必然对不上账 |
| 目录与购买 UI | **原生重写** | App Store 审核指南 4.2 会拒 WebView 壳。而且这是转化路径，体验不能妥协 |
| 支付页 | **复用网站页面**，走应用内浏览器 | 见下 |

支付这层值得单独说清楚，因为它是最反直觉的一处。App 用 `expo-web-browser` 的
`openAuthSessionAsync` 打开网站已有的 Checkout 页（iOS 是 SFSafariViewController，
Android 是 Chrome Custom Tabs），付完通过 deep link `voyaesim://` 回跳。
这样做换来三件事：**PCI 合规范围留在网站**不扩散到 App；**3DS 银行跳转天然可用**
（银行跳转在原生 SDK 里很难处理干净）；**新增支付方式只改网站**，App 不用发版。

合规依据：eSIM 套餐属于 App Store 审核指南 **3.1.3(e)**「在 App 之外消费的商品
或服务」，可以用自有支付，不必走 IAP（不必被抽 30%）。Airalo 和 Holafly 都是
这个做法。同时注意 **4.8**：如果提供第三方登录，必须同时提供 Apple 登录。

**关键陷阱：回跳 URL 不是支付成功的证据。** 用户回到 App 只说明浏览器关了，
可能是付完了，也可能是中途取消。必须轮询 `GET /orders/{id}` 拿服务端状态。

---

## 2. 技术栈选型（含一次我自己推翻的推荐）

**React Native + Expo SDK 52**。用户对 Flutter / Expo 无偏好，明确说
「我只需要用最适合的技术栈」，也说明现有项目都是 AI 写的、不代表个人技能栈。

选 Expo 的真实理由，按重要性排：

1. **EAS Update 的 OTA 热更新。** 这是决定性的。连接性产品出问题——用户在国外
   落地装不上卡——不能等 App Store 审核 1~3 天。改 JS 层的 bug 几分钟推上去。
2. **和网站共享 TypeScript 契约类型。** `src/shared/api-types.ts` 三端一份。
   Flutter 要手写一遍 Dart 模型，改契约就要改两处、且没有编译器帮你对齐。
3. **expo-notifications** 开箱可用，流量告警和到期提醒是这个 App 的留存抓手。

**需要记录的一次错误：** 我最初推荐 Expo 时给的理由是「eSIM 安装有现成的 RN
模块」。这个理由是错的，我已向用户承认。实际上 iOS 和 Android 都需要各写约
150 行原生代码，两个框架在这件事上工作量相当。后续讨论不要再用这个论据。

**必须用 EAS Build，Expo Go 不够。** Expo Go 加载不了自定义原生模块，也挂不上
entitlement。UI 改动可以用 Expo Go 预览，一碰装卡流程就必须用 dev client。

---

## 3. 已完成的三份交付物

### 3.1 可点击高保真原型
用户反馈「方向对，直接开发」。视觉方向：**登机牌隐喻**——已购的卡用登机牌卡片
呈现（`BoardingPass.tsx`），深色底 + 琥珀色强调 + 等宽字体的数字。流量详情页
刻意用深色底，和其余浅色页面形成层级差，让用户感知「进到卡的内部了」。

### 3.2 API 契约 `docs/api-contract.md`（v0.2，1178 行，13 节）
含两个状态机、时序图、幂等策略、缓存策略、给后端的实现优先级。

**订单状态机：** `pending_payment → paid → completed`，旁支
`provisioning_failed` / `refunded` / `expired` / `cancelled`。

**eSIM 状态机：** `provisioning → ready → installed → active`，旁支
`depleted` / `expired` / `suspended`。

三端共用，网站已按 v0.2 改造完成（网站那侧还剩支付没接真）。

### 3.3 Expo 骨架（本仓库，51 个文件，约 6900 行）
16 屏 UI + 主题 token + TanStack Query 数据层 + Mock 数据 + 原生安装模块 +
config plugin。`tsc --noEmit` 零错误，config plugin 实测可跑且幂等。

---

## 4. 骨架里几个非显然的设计决定

**Mock 放在 `client.ts` 层而不是页面层。** 所以 `USE_MOCK` 开关切换真假数据时，
18 个 hook 之外的页面代码一行不用改。接后端就是逐个 hook 删掉
`if (USE_MOCK) return delay(...)`。

**每个资源单独设 `staleTime`，不用全局默认值。** 目录 24 小时（几乎不变）、
套餐价格 60 分钟（可能调价）、eSIM 列表 2 分钟（打开即刷新）、用量 5 分钟、
**激活凭证 `Infinity`**。最后这个配合 AsyncStorage persister 做离线可用。

**`LocalizedText` 是契约层决策，不是实现细节。** 目录字段返回 `{en, zh}` 对象
而不是靠 `Accept-Language` 返回单语字符串。这样网站切语言是纯客户端行为、零
请求，SEO 也能按 locale 建静态路由。代价是 App 端要有个解析器：
`src/lib/i18n.ts` 的 `t()`。

为什么不在 40 个渲染点直接写 `.zh`：加西班牙语时要改 40 处，漏一处就是中文
漏进英文界面。`currentLocale()` 是将来接 `GET /me/preferences.locale` 的唯一
入口——用户会刻意选一个和系统语言不同的语言。目录语言和界面语言故意允许不一致，
目录缺对应语言时回退到 `en` 而不是渲染空白。

`LocaleCode` 是 `'zh'` 不是 `'zh-CN'`（曾在三处不一致，已统一）。

**`CatalogFilter = 'popular' | 'multi' | \`region:${Region}\`` 故意与 `Region`
正交。** 如果做成一个扁平枚举，`popular` 和 `asia` 就会挤在同一个类型里，
而它们根本不是同一个维度的东西。

**搜索同时匹配中英文名。** 用英文键盘的用户会打 "japan"，中文用户打「日本」，
只搜当前语言会让另一半用户以为没有这个国家。

**推送权限在首次装卡成功之后才请求，不在冷启动时。** iOS 只给一次机会，
冷启动时用户还不理解这个 App 为什么需要通知。装卡成功那一刻他刚体验到价值。
`POST /devices` 失败被静默吞掉（`.catch(() => null)`），注册失败绝不阻塞用户。

**原生配置走 config plugin 而不是手改 `ios/` `android/`。** `expo prebuild` 会
重新生成这两个目录，手改会被静默覆盖。`plugins/withEsimEntitlement.js` 注入
iOS entitlement `com.apple.CommercialCellularPlanProvisioning`、
`CTCellularPlanProvisioningSupported`、Android 的 `READ_PHONE_STATE` 权限和
`EuiccService` 的 `<queries>` 声明。已实测跑两遍幂等、不覆盖已有权限。

原本用 `AndroidConfig.Permissions.ensurePermission()`，后改为直接操作 manifest
对象——那个辅助函数的签名在不同 Expo SDK 版本间变过，直接写更稳，也就几行。

**`expo.autolinking.nativeModulesDir = "./modules"`** 写在 `package.json` 里，
本地原生模块才能被解析到。

---

## 5. eSIM 装卡的原生实现要点

**iOS：** `CTCellularPlanProvisioning` + `CTCellularPlanProvisioningRequest`，
需要 entitlement `com.apple.CommercialCellularPlanProvisioning`。最低 iOS 15.1。

**Android：** `EuiccManager.ACTION_START_EUICC_ACTIVATION` Intent。注意普通应用
**不能**调 `downloadSubscription()`，那需要运营商特权（carrier privileges）。
minSdk 28。Android 11+ 还要 `<queries>` 声明才能看见 `EuiccService`。

**LPA 字符串格式：** `LPA:1$<SM-DP+ 地址>$<matching ID>`。

**兜底路径已实现：** `esim/[id]/manual.tsx` 提供二维码和手动输入信息，
在 entitlement 没批下来、或用户设备不支持一键装卡时用。

---

## 6. 当前进度

**已完成**
- 信息架构、视觉方向、可点击原型（用户已确认方向）
- 数据模型与两个状态机
- API 契约 v0.2 全文 + 时序图 + 幂等策略
- Expo 工程配置、主题 token、18 个 Query hook、Mock 数据层
- 16 屏全部 UI、Expo Router 导航
- 原生 eSIM 安装模块（Swift + Kotlin）、entitlement config plugin
- 骨架自检：`tsc --noEmit` 零错误；config plugin 实测幂等；16 个路由目标全部
  对应真实文件；组件导入无缺失；无密钥硬编码
- git 初始化并提交（51 文件），远端已配置

**未完成 / 未验证**
- **从未在真机或模拟器上跑过。** 需要 EAS Build，得用用户自己的
  Apple / Google 账号
- 数据层全是 Mock，未接任何真实接口
- `mockRegionInfos` 已在 mock 数据里但没有 hook 或页面消费它（注意 `useRegions`
  返回的是 `Destination[]`，即多国卡列表，不是这个）。要么接进商店页筛选行显示
  `destination_count`，要么当契约完整性的脚手架留着
- **10 处 `Alert.alert` 占位**，`grep -rn "骨架版本" app` 可列全：
  - `checkout.tsx` 4 处：优惠码、接收邮箱、Apple Pay、PayPal
  - `(tabs)/account.tsx` 3 处：支付方式、通知开关、条款与隐私
  - `(tabs)/help.tsx` 1 处：帮助条目跳转
  - `preferences.tsx` 1 处：语言货币只切本地状态，未 `PUT /preferences`
  - `esim/[id]/topup.tsx` 1 处：自动加购
  另有「给 App 评分」待接 `expo-store-review`
- 推送：`expo-notifications` 已装、`push.ts` 已写，但没接真实推送凭证

---

## 7. 下一步，按依赖顺序

**这两件必须先做，因为周期不由自己控制：**

1. **选定上游 eSIM 供应商。** 候选与评估维度写在 `docs/api-contract.md` §11。
   选型时重点看四件事：余量接口的延迟和调用限制（决定强制刷新的节流参数）、
   是否支持加购（不支持则契约第 5 节整节作废）、开卡是同步还是异步（异步则订单
   状态机要多一个中间态）、沙箱环境是否完整（没 sandbox 联调会很痛苦）。

2. **提交 iOS entitlement 申请。** `com.apple.CommercialCellularPlanProvisioning`
   要单独向 Apple 申请，周期数周到数月且不可预测。**必须在选定供应商之后**
   ——Apple 会问 profile 从哪来。这是整个项目唯一控制不了的外部依赖，
   建议立刻提交，别等代码写完。等待期用手动/二维码路径撑住上线。

**然后：**

3. 契约 §4.x / §5.x 的字段对齐到所选供应商的实际响应结构
4. 后端实现（已决策 TypeScript + NestJS + Postgres），顺序见契约 §12
5. 逐个 hook 摘掉 `USE_MOCK` 分支，接真实接口
6. 网站侧接真实支付（`POST /orders` + Stripe），理由见
   `esim-shop/docs/api-gap-analysis.md` §5
7. EAS Build 出 dev client，真机跑通装卡流程
8. 补齐 10 处占位设置项、接推送凭证与 `expo-store-review`

---

## 8. 环境与协作注意

**工作目录是 FUSE 挂载，不允许 unlink。** 删文件、git 操作、覆盖写的构建流程
都可能报 `Operation not permitted`。绕法是先 tar 到本地 `/tmp` 再操作。
git 的 `.git/index.lock` 特别容易卡住——报「Another git process seems to be
running」时通常是上次操作留下的锁删不掉，不是真有进程在跑。

**契约类型有两份副本**：本仓库 `src/shared/api-types.ts` 和
`esim-shop/src/types/api.ts`。改一边必须改另一边。将来合 monorepo 时抽成
`packages/shared`。

**凭证不要贴进对话。** 曾经有一个 GitHub PAT 明文出现在对话里，已提醒吊销。
凭证一旦进入聊天记录、日志或第三方服务就应视为已泄露。需要给 AI 工具仓库权限
时，用细粒度、短期、最小权限的 token，或者干脆自己在本机执行推送。
