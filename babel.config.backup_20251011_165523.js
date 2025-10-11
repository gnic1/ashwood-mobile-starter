module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // keep this LAST
      'react-native-reanimated/plugin',
    ],
  };
};