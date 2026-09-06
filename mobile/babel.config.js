/**
 * Babel configuration for GymFlow Mobile.
 * Uses babel-preset-expo with Reanimated 4 / Worklets plugin.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
