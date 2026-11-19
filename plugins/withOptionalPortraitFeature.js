const { withAndroidManifest } = require("expo/config-plugins");

const PORTRAIT_FEATURE = "android.hardware.screen.portrait";

module.exports = function withOptionalPortraitFeature(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$["xmlns:tools"] ??= "http://schemas.android.com/tools";

    const features = manifest["uses-feature"] ?? [];
    // Keep the activity's portrait preference while overriding Play's implied requirement.
    manifest["uses-feature"] = [
      ...features.filter((feature) => feature.$?.["android:name"] !== PORTRAIT_FEATURE),
      {
        $: {
          "android:name": PORTRAIT_FEATURE,
          "android:required": "false",
          "tools:replace": "android:required"
        }
      }
    ];
    return config;
  });
};
