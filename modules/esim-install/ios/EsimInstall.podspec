Pod::Spec.new do |s|
  s.name           = 'EsimInstall'
  s.version        = '1.0.0'
  s.summary        = 'One-tap eSIM provisioning via CTCellularPlanProvisioning'
  s.author         = 'Voya'
  s.homepage       = 'https://voyaesim.com'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # CoreTelephony 提供 CTCellularPlanProvisioning
  s.frameworks = 'CoreTelephony'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
