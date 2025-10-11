module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Expo Router
      require.resolve('expo-router/babel'),
      // Reanimated must be last
      'react-native-reanimated/plugin'
    ],
  };
};
