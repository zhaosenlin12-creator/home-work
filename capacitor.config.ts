import type { CapacitorConfig } from "@capacitor/cli";

/**
 * 森灵 Android App 配置
 *
 * 架构说明（重要）：
 * 本应用依赖 Next.js 服务端 API（node:sqlite），无法静态打包进 App。
 * 因此 App 采用「壳 + 局域网服务」模式：
 *   - Android 上运行的是 Capacitor WebView 壳
 *   - server.url 指向电脑上运行的森灵服务（start.bat 启动）
 *   - 孩子点击 App 图标 = 全屏打开应用（无地址栏，接近原生体验）
 *
 * 使用：
 * 1. 电脑运行 start.bat（或 npm start）
 * 2. 确认手机与电脑同一 Wi-Fi，把下面的 SERVER_URL 改为电脑局域网 IP
 * 3. npx cap sync android && cd android && gradlew assembleDebug
 */
const SERVER_URL = "http://192.168.10.109:3101";

const config: CapacitorConfig = {
  appId: "com.senlin.app",
  appName: "森灵",
  webDir: "public",
  server: {
    // 局域网模式：WebView 直接加载电脑上的服务（需电脑在线、同一 Wi-Fi）
    url: SERVER_URL,
    cleartext: true, // 允许 http（局域网明文，调试/家庭自用）
    androidScheme: "http",
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
