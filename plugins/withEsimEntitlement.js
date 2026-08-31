const {
  withEntitlementsPlist,
  withInfoPlist,
  withAndroidManifest,
  createRunOncePlugin,
} = require('expo/config-plugins');

/**
 * eSIM 安装能力的 Config Plugin。
 *
 * 为什么必须是 config plugin 而不是手改 Xcode 工程：
 * Expo 的 prebuild 会重新生成 ios/ 和 android/ 目录，手改会被覆盖。
 * 把这些原生配置写成插件，才能在 EAS Build 的干净环境里可复现。
 *
 * ⚠️⚠️ iOS 最大的外部依赖，也是这个项目唯一不受你控制的一环：
 *
 *   com.apple.CommercialCellularPlanProvisioning
 *
 * 这个 entitlement 不是勾一下就有的，必须单独向 Apple 提交申请，
 * 说明你是电信服务提供商或其授权代理，审批周期不可控（历史上从数周到数月都有）。
 * 没有它，CTCellularPlanProvisioning.addPlan 会直接失败。
 *
 * 建议现在就提申请，不要等代码写完 —— 代码两周能写完，审批不一定。
 * 申请入口：https://developer.apple.com/contact/request/esim-entitlement
 *
 * 审批下来之前，App 依然可用：一键安装会返回 unsupported，
 * 用户自动落到二维码 / 手动安装页（app/esim/[id]/manual.tsx），
 * 功能不至于全丢，只是体验退回到网站的水平。
 */

const IOS_ENTITLEMENT = 'com.apple.CommercialCellularPlanProvisioning';

function withIosEsim(config) {
  config = withEntitlementsPlist(config, (cfg) => {
    cfg.modResults[IOS_ENTITLEMENT] = true;
    return cfg;
  });

  // CTCellularPlanProvisioning 需要读取运营商信息判断设备是否支持
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults['CTCellularPlanProvisioningSupported'] = true;
    return cfg;
  });

  return config;
}

/**
 * Android 侧要声明的两件事：
 * 1. READ_PHONE_STATE —— EuiccManager.isEnabled 判断设备有没有 eUICC 需要它
 * 2. 查询 eSIM 相关 Activity 的 queries 声明 —— Android 11+ 的包可见性限制下，
 *    不声明就查不到系统 eSIM 设置界面，Intent 会静默失败
 *
 * 注意 Android 普通应用不能调 EuiccManager.downloadSubscription()，
 * 那需要 carrier privileges。我们只能发 ACTION_START_EUICC_ACTIVATION Intent
 * 让系统 LPA 接管，见 modules/esim-install/android/EsimInstallModule.kt。
 */
function withAndroidEsim(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;

    // 直接操作 manifest 而不用 AndroidConfig.Permissions 辅助函数：
    // 后者在不同 SDK 版本间签名变过，直接写更稳，逻辑也就这几行。
    manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'] ?? [];
    const perms = manifest.manifest['uses-permission'];
    const hasPerm = perms.some(
      (p) => p.$?.['android:name'] === 'android.permission.READ_PHONE_STATE',
    );
    if (!hasPerm) {
      perms.push({ $: { 'android:name': 'android.permission.READ_PHONE_STATE' } });
    }

    manifest.manifest.queries = manifest.manifest.queries ?? [{}];
    const q = manifest.manifest.queries[0];
    q.intent = q.intent ?? [];

    const already = q.intent.some(
      (i) => i.action?.[0]?.$?.['android:name'] === 'android.service.euicc.EuiccService',
    );
    if (!already) {
      q.intent.push({
        action: [{ $: { 'android:name': 'android.service.euicc.EuiccService' } }],
      });
    }

    return cfg;
  });
}

function withEsimEntitlement(config) {
  config = withIosEsim(config);
  config = withAndroidEsim(config);
  return config;
}

module.exports = createRunOncePlugin(withEsimEntitlement, 'withEsimEntitlement', '1.0.0');
