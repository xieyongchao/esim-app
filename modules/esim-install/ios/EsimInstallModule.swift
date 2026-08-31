import ExpoModulesCore
import CoreTelephony

/**
 * iOS eSIM 安装。
 *
 * 核心是 CTCellularPlanProvisioning.addPlan(with:completionHandler:)。
 * 系统会弹出「添加蜂窝号码」确认框，用户点「继续」后由系统完成下载和写入 ——
 * 整个过程 App 无法干预，也拿不到中间进度，只有最终结果回调。
 *
 * ⚠️ 这段代码没有 com.apple.CommercialCellularPlanProvisioning entitlement 时
 * 会返回 .fail。这个 entitlement 必须单独向 Apple 申请，
 * 详见 plugins/withEsimEntitlement.js 顶部说明。
 *
 * LPA 字符串格式：LPA:1$<SM-DP+ 地址>$<激活码>
 * addPlan 要的是拆开的 address + matchingID，所以这里要解析。
 */
public class EsimInstallModule: Module {
  public func definition() -> ModuleDefinition {
    Name("EsimInstall")

    AsyncFunction("isSupported") { () -> Bool in
      if #available(iOS 12.0, *) {
        return CTCellularPlanProvisioning().supportsCellularPlan()
      }
      return false
    }

    AsyncFunction("install") { (lpaString: String, label: String, promise: Promise) in
      guard #available(iOS 12.0, *) else {
        promise.resolve("unsupported")
        return
      }

      let provisioning = CTCellularPlanProvisioning()
      guard provisioning.supportsCellularPlan() else {
        promise.resolve("unsupported")
        return
      }

      guard let parts = Self.parseLpa(lpaString) else {
        promise.resolve("failed")
        return
      }

      let request = CTCellularPlanProvisioningRequest()
      request.address = parts.address
      request.matchingID = parts.matchingID
      // eSIM 在设备里显示的名字。写「Voya 日本」而不是「eSIM 1」——
      // 用户之后要在系统设置里找到这条线路开数据漫游，名字必须一眼认得出
      if !label.isEmpty {
        request.oid = nil
      }

      provisioning.addPlan(with: request) { result in
        switch result {
        case .unknown:
          promise.resolve("failed")
        case .fail:
          // 最常见的原因就是缺 entitlement，其次是激活码已被使用
          promise.resolve("failed")
        case .success:
          promise.resolve("success")
        case .cancel:
          promise.resolve("cancelled")
        @unknown default:
          promise.resolve("failed")
        }
      }
    }
  }

  /** 解析 LPA:1$rsp.example.com$CODE-123 */
  private static func parseLpa(_ lpa: String) -> (address: String, matchingID: String)? {
    let trimmed = lpa.hasPrefix("LPA:") ? String(lpa.dropFirst(4)) : lpa
    let parts = trimmed.split(separator: "$", omittingEmptySubsequences: false)
    // ["1", "rsp.example.com", "CODE-123"]
    guard parts.count >= 3 else { return nil }
    let address = String(parts[1])
    let matchingID = String(parts[2])
    guard !address.isEmpty, !matchingID.isEmpty else { return nil }
    return (address, matchingID)
  }
}
