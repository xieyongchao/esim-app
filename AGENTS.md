# Voya eSIM App · 项目规则

> **接手前先读 `docs/HANDOFF.md`** —— 进度、决策与理由、原生装卡实现要点、
> 10 处占位清单、下一步（按依赖排序）都在那里。
> 接口字段看 `docs/api-contract.md`（v0.2，三端唯一事实来源）。
> 跨仓库总览（含网站侧）看 `../esim-shop/docs/project-status.md`。
>
> 这份 AGENTS.md 只放**动手时不能违反的硬规则**，不重复上面几份的内容。

## 一句话定位

配套 eSIM 售卖网站（`../esim-shop`）的移动端。**纯展示壳**，业务全在后端。
App 的存在理由是网页做不到的两件事：**一键安装 eSIM** 和 **推送通知**。
RN 0.76 + Expo SDK ~52 + expo-router 4 + TanStack Query 5，现在全跑在 mock 上。

## 跑起来

必须用 **EAS Build**，不能用 Expo Go：后者加载不了自定义原生模块
（`modules/esim-install/`），也挂不上 eSIM entitlement。

```bash
npm run typecheck
npm run build:ios       # eas build --profile development
npm run ios             # 有 dev client 之后
```

Mock 开关是 `EXPO_PUBLIC_USE_MOCK`（development=1、preview/production=0），
判断落在 `src/api/client.ts` 的 `USE_MOCK`。**mock 放在 client 层不是页面层**，
所以关掉它页面代码一行不用改 —— 别把 mock 判断搬到组件里。

## 硬规则

1. **金额一律最小单位整数**（`5220` = ¥52.20），绝不用浮点。定价全部服务端算，
   App 不做任何价格计算。

2. **切货币必须带 `X-Currency` 回服务端重新取价**，App 内绝不做汇率换算 ——
   换算出来的数字和实际扣款对不上，用户会认为被多收钱。

3. **有效期从首次连上当地网络开始算**，由服务端 `activation_policy` 驱动，
   绝不硬编码。网站那边已经因为写死这个出过一个真 bug。

4. **`installed` 与 `active` 是两个状态**，不能合并，否则倒计时提前开始。
   **`paid` 与 `completed` 也必须分开**，否则上游开卡抖动时用户以为被骗。

5. **回跳 URL 不是支付成功的证据。** `voyaesim://` deep link 只说明「用户从浏览器
   回来了」—— 它可以被伪造，也可能在支付成功但回跳失败时根本不出现。
   必须轮询 `GET /orders/{id}`，轮询策略见契约 §3.5。

6. **ICCID 属敏感卡标识**，只出现在 `ActivationCredentials` 上，列表接口不返回。
   不要为了「界面上多显示一点信息」把它拉进列表。

7. **错误文案不自己拼。** 服务端返回的 `message` 已本地化，直接显示
   （见 `src/api/client.ts` 的 `ApiError`）。App 自己维护错误文案表的话，
   后端每加一个错误码就要发一次版本。

8. **`src/shared/api-types.ts` 是契约类型的正本，`../esim-shop/src/types/api.ts`
   是它的副本。** 改这边必须同时改那边。已知技术债，合 monorepo 前只能靠人守。
   这个文件刻意不 import 任何 React Native / Expo 的东西，保持这样，
   否则网站没法用。

9. **目录与购买 UI 必须原生实现**，不要为了省事套 WebView ——
   App Store 审核指南 4.2 会拒。只有支付页走应用内浏览器
   （`expo-web-browser`）+ deep link 回跳，这样 PCI 范围留在网站、
   3DS 银行跳转能work、将来加支付方式只改网站一处。

10. **eSIM 套餐属指南 3.1.3(e) 实体外消费，用自有支付不走 IAP**
    （Airalo、Holafly 同做法）。不要改成 IAP。

## 目录结构

```
app/                     expo-router 路由，16 屏
src/api/client.ts        USE_MOCK 开关 + ApiError
src/api/hooks.ts         TanStack Query hooks
src/api/mock-data.ts     mock 数据（接后端后由 USE_MOCK=0 绕过）
src/shared/api-types.ts  ★ 契约类型正本，勿引入 RN/Expo 依赖
src/lib/esim-install.ts  原生模块的 JS 封装
src/lib/i18n.ts          LocalizedText 解析，currentLocale() 是将来接
                         GET /me/preferences.locale 的唯一入口
modules/esim-install/    Swift（iOS）+ Kotlin（Android）各约 150 行
plugins/withEsimEntitlement.js   config plugin，已实测幂等
```

## 两个外部阻塞（不在代码里，但决定能不能上线）

**iOS entitlement** `com.apple.CommercialCellularPlanProvisioning` 要单独向
Apple 申请，周期数周到数月不可预测。没有它一键安装不能用，
兜底是手动 / 二维码安装路径（已实现）。**应该现在就提交申请，别等代码写完。**

**上游 eSIM 供应商未选定。** 选型要**先于** entitlement 申请（Apple 会问
profile 来源），且契约 §4、§5 要按所选供应商的响应结构对齐。

## 语言

代码注释和文档用中文，UI 文案中英双语（`LocaleCode` 是 `'zh'` 不是 `'zh-CN'`）。
注释写「为什么」，不写「做了什么」。

## 一处已被纠正的说法

选 Expo 的理由是 **EAS Update 的 OTA**（连接性产品出问题不能等审核），
**不是**「eSIM 安装有现成 RN 模块」—— 后者是错的，两个平台都得手写原生代码。
别再用「有现成模块」当论据。
