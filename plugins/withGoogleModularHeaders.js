const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Ensures Google Sign-In / AppCheck Swift pods get modular headers
 * after `expo prebuild` regenerates the Podfile.
 */
function withGoogleModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      if (!fs.existsSync(podfilePath)) return cfg;
      let contents = fs.readFileSync(podfilePath, "utf8");
      if (contents.includes("GoogleUtilities', :modular_headers")) {
        return cfg;
      }
      const needle = "  use_expo_modules!\n";
      if (!contents.includes(needle)) return cfg;
      contents = contents.replace(
        needle,
        `${needle}
  # Google Sign-In / AppCheckCore Swift pods need modular headers
  pod 'GoogleUtilities', :modular_headers => true
  pod 'RecaptchaInterop', :modular_headers => true
`
      );
      fs.writeFileSync(podfilePath, contents);
      return cfg;
    }
  ]);
}

module.exports = withGoogleModularHeaders;
