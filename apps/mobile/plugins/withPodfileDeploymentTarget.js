// Config plugin: Xcode 27 requires iOS >= 15.0, but some pods' resource-bundle
// targets still declare 12.4/13.4 and fail the build. Appends a loop to the
// Expo Podfile's post_install that raises every pod target to 15.1. Applied on
// every `expo prebuild`, so the generated ios/ folder never needs hand edits.
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const LOOP = `    # Xcode 27 requires >= 15.0; some pods' resource-bundle targets still declare 12.4/13.4
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
          c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end
`;

module.exports = function withPodfileDeploymentTarget(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      let s = fs.readFileSync(podfile, "utf8");
      if (!s.includes("Xcode 27 requires")) {
        s = s.replace(/(post_install do \|installer\|\n)/, `$1${LOOP}`);
        fs.writeFileSync(podfile, s);
      }
      return cfg;
    },
  ]);
};
