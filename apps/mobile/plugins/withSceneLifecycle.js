// Config plugin: minimal UIScene lifecycle adoption for iOS.
// The iOS 27 SDK (Xcode 27) refuses to launch apps that have not adopted the
// scene lifecycle (UIKit traps in UIApplicationEvaluateRuntimeIssueForNoScene-
// LifecycleAdoption); React Native 0.81 / Expo 54's AppDelegate predates it.
// We keep Expo's window + React root exactly as generated and simply attach
// that window to the scene when it connects, forwarding scene-level URL and
// user-activity callbacks to the existing linking handlers. Applied on every
// `expo prebuild`, idempotent.
const { withDangerousMod, withInfoPlist } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARK = "// MARK: - UIScene lifecycle (plugins/withSceneLifecycle)";
const EXT = `
${MARK}
extension AppDelegate: UIWindowSceneDelegate {
  public func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene else { return }
    // The window (and React root) was created in didFinishLaunching; attach it to the scene.
    window?.windowScene = windowScene
    window?.makeKeyAndVisible()
    for context in connectionOptions.urlContexts {
      _ = self.application(UIApplication.shared, open: context.url, options: [:])
    }
    if let activity = connectionOptions.userActivities.first {
      _ = self.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
    }
  }
  public func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = self.application(UIApplication.shared, open: context.url, options: [:])
    }
  }
  public func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = self.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: "Default", UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).AppDelegate" },
        ],
      },
    };
    return cfg;
  });
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const dir = cfg.modRequest.platformProjectRoot;
      const name = cfg.modRequest.projectName;
      const file = path.join(dir, name, "AppDelegate.swift");
      let s = fs.readFileSync(file, "utf8");
      if (!s.includes("import UIKit")) s = s.replace("import Expo\n", "import Expo\nimport UIKit\n");
      if (!s.includes(MARK)) s += EXT;
      fs.writeFileSync(file, s);
      return cfg;
    },
  ]);
};
