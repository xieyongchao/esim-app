# eSIM 一键安装原生模块

这个模块是 App 相对网站唯一无法复用的能力 —— 网页无法调起系统 eSIM 安装界面，
用户只能扫码或手抄激活码，而那是这个品类最高的流失点。

TS 侧门面在 `src/lib/esim-install.ts`，页面通过它调用，不直接碰 NativeModules。

## 平台差异

| | iOS | Android |
|---|---|---|
| API | `CTCellularPlanProvisioning.addPlan(with:)` | `EuiccManager.ACTION_START_EUICC_ACTIVATION` Intent |
| 最低版本 | iOS 12 | API 28 (Android 9) |
| 前置条件 | **需要单独申请 entitlement** | 声明 `READ_PHONE_STATE` + `queries` |
| 进度可见 | 无，只有最终回调 | 无，只有 resultCode |
| 失败率 | 低 | 较高（各家 ROM 实现不一，部分国产 ROM 阉割了这个 Intent） |

## ⚠️ iOS entitlement：项目唯一不受控的外部依赖

`com.apple.CommercialCellularPlanProvisioning` 不是在 Xcode 里勾一下就有的，
必须单独向 Apple 提交申请，说明你是电信服务提供商或其授权代理。
审批周期不可控 —— 历史上从数周到数月都有。

**建议现在就提申请，不要等代码写完。** 代码两周能写完，审批不一定。

申请入口：<https://developer.apple.com/contact/request/esim-entitlement>

需要准备的材料通常包括：公司主体信息、与上游 eSIM 供应商的合作证明、
App 的用途说明和截图。这也是为什么上游供应商选型（Task 待办）
最好在提申请之前定下来 —— Apple 会问你的 profile 从哪来。

## 审批下来之前 App 依然可用

`isSupported()` 返回 false 时，`installEsim()` 返回 `unsupported`，
安装页会引导用户去 `app/esim/[id]/manual.tsx`（二维码 / 手动填激活码）。
功能不至于全丢，只是体验退回到网站的水平。

这个降级路径在 Android 上尤其重要 —— 不是可选项，是主路径的一部分。

## 为什么必须用 EAS Build

Expo Go 无法加载自定义原生模块，也无法附加 entitlement。
开发阶段就要用 development build：

```bash
npm run build:ios      # eas build --platform ios --profile development
npm run build:android
```

`plugins/withEsimEntitlement.js` 会在 prebuild 时把 entitlement、Info.plist 键、
Android 权限和 `queries` 声明注入进去。手改 `ios/` 或 `android/` 目录会被下次
prebuild 覆盖，所有原生配置都要走 config plugin。

## 安装结果上报

无论成败都调 `POST /esims/{id}/install-result`（`useReportInstall`）。
失败数据是优化安装引导的唯一依据 —— 哪个机型、哪个系统版本、哪一步失败，
不上报就只能靠客服工单猜。
