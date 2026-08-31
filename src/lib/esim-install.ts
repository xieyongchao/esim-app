import { NativeModules, Platform } from 'react-native';
import * as Device from 'expo-device';
import type { InstallResult, InstallResultReport } from '@shared/api-types';

/**
 * 一键安装 eSIM —— App 相对网站最大的差异。网页无法调起系统 eSIM 安装，
 * 用户只能靠扫码或手抄激活码，那是这个品类最高的流失点。
 *
 * 这一层是 TS 侧的门面，真正的原生实现见 modules/esim-install/（Task 14）：
 *   iOS    → CTCellularPlanProvisioning.addPlan(with:)
 *            需要 entitlement com.apple.CommercialCellularPlanProvisioning，
 *            必须单独向 Apple 申请，审批周期不可控。⚠️ 建议现在就提申请。
 *   Android→ EuiccManager.ACTION_START_EUICC_ACTIVATION Intent
 *            普通应用不能直接调 downloadSubscription()，只能发这个 Intent 让系统接管。
 *
 * 原生模块缺失时（比如在 Expo Go 里跑）返回 unsupported 而不是崩 ——
 * 让用户落到二维码/手动安装的兜底路径上，功能不至于全丢。
 */

interface EsimInstallNative {
  isSupported(): Promise<boolean>;
  install(lpaString: string, label: string): Promise<string>;
}

const native = (NativeModules as Record<string, EsimInstallNative | undefined>)
  .EsimInstall;

export async function isEsimSupported(): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.isSupported();
  } catch {
    return false;
  }
}

/**
 * 调起系统安装弹窗。返回的是「系统告诉我们的结果」，
 * 注意 success 只意味着 profile 写进设备了，不代表用户已经打开数据漫游 ——
 * 所以安装完成页还必须教用户开漫游，这是客服工单最集中的一步。
 */
export async function installEsim(
  lpaString: string,
  label: string,
): Promise<InstallResult> {
  if (!native) return 'unsupported';
  try {
    const r = await native.install(lpaString, label);
    if (r === 'success' || r === 'cancelled' || r === 'failed') return r;
    return 'failed';
  } catch {
    return 'failed';
  }
}

/** 上报安装结果用的设备信息。失败数据是优化安装引导的唯一依据 */
export function installContext(): Omit<InstallResultReport, 'result' | 'error_code'> {
  return {
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    os_version: String(Device.osVersion ?? Platform.Version),
    device_model: Device.modelName ?? 'unknown',
  };
}
