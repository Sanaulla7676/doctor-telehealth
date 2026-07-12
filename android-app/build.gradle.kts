// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
  alias(libs.plugins.android.application) apply false
  alias(libs.plugins.kotlin.compose) apply false
  alias(libs.plugins.google.devtools.ksp) apply false
  alias(libs.plugins.roborazzi) apply false
  alias(libs.plugins.secrets) apply false
  alias(libs.plugins.google.services) apply false
}

tasks.register("printApkSize") {
    doLast {
        val apkFile = file("app-debug.apk")
        if (apkFile.exists()) {
            println("APK_SIZE_BYTES: ${apkFile.length()}")
            println("APK_SIZE_MB: ${apkFile.length().toDouble() / (1024.0 * 1024.0)}")
        } else {
            println("APK_SIZE_NOT_FOUND")
        }
    }
}
