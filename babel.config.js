module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"]
    // Do NOT add react-native-reanimated/plugin here on Expo SDK 54+.
    // babel-preset-expo wires Reanimated/Worklets automatically.
  };
};
