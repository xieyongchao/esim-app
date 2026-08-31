package com.voyaesim.esiminstall

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.telephony.euicc.EuiccManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Android eSIM 安装。
 *
 * 关键约束：普通应用不能调 EuiccManager.downloadSubscription()，
 * 那个 API 需要 carrier privileges（运营商级签名权限），我们拿不到。
 *
 * 能用的是 ACTION_START_EUICC_ACTIVATION Intent —— 把 LPA 字符串交给系统 LPA，
 * 由系统自己的 eSIM 界面完成下载和写入。这意味着：
 * - 我们看不到中间进度，只有 Activity 返回的 resultCode
 * - 各家 OEM 的系统 eSIM 界面长得不一样，体验没法统一
 * - 部分国产 ROM 阉割了这个 Intent，会直接抛 ActivityNotFoundException
 *
 * 所以 Android 上「一键安装失败」的概率明显高于 iOS，
 * 二维码 / 手动安装的兜底路径在 Android 上尤其重要，不是可选项。
 */
class EsimInstallModule : Module() {

  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  private val currentActivity: Activity?
    get() = appContext.currentActivity

  override fun definition() = ModuleDefinition {
    Name("EsimInstall")

    AsyncFunction("isSupported") {
      val mgr = context.getSystemService(Context.EUICC_SERVICE) as? EuiccManager
      mgr?.isEnabled == true
    }

    AsyncFunction("install") { lpaString: String, label: String, promise: Promise ->
      val mgr = context.getSystemService(Context.EUICC_SERVICE) as? EuiccManager
      if (mgr?.isEnabled != true) {
        promise.resolve("unsupported")
        return@AsyncFunction
      }

      val activity = currentActivity
      if (activity == null) {
        promise.resolve("failed")
        return@AsyncFunction
      }

      try {
        val intent = Intent(EuiccManager.ACTION_START_EUICC_ACTIVATION).apply {
          // 系统 LPA 认这个 extra。注意 key 名在 API 33 才公开常量化，
          // 这里用字面量兼容 API 28+
          putExtra("android.telephony.euicc.extra.USE_QR_SCANNER", false)
          putExtra(SMDP_ACTIVATION_CODE, lpaString)
          if (label.isNotEmpty()) putExtra(SUBSCRIPTION_NICKNAME, label)
        }
        activity.startActivityForResult(intent, REQUEST_CODE)
        // 结果由 OnActivityResult 回调解析
        pending = promise
      } catch (e: Exception) {
        // 部分 ROM 没有实现这个 Intent —— 落到手动安装路径
        promise.resolve("unsupported")
      }
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != REQUEST_CODE) return@OnActivityResult
      val p = pending ?: return@OnActivityResult
      pending = null
      when (payload.resultCode) {
        Activity.RESULT_OK -> p.resolve("success")
        Activity.RESULT_CANCELED -> p.resolve("cancelled")
        else -> p.resolve("failed")
      }
    }
  }

  private var pending: Promise? = null

  companion object {
    private const val REQUEST_CODE = 0x4E51
    private const val SMDP_ACTIVATION_CODE =
      "android.telephony.euicc.extra.ACTIVATION_CODE"
    private const val SUBSCRIPTION_NICKNAME =
      "android.telephony.euicc.extra.SUBSCRIPTION_NICKNAME"
  }
}
