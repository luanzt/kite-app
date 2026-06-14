module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@api': './src/api',
          '@assets': './src/assets',
          '@components': './src/components',
          '@hooks': './src/hooks',
          '@navigation': './src/navigation',
          '@screens': './src/screens',
          '@store': './src/store',
          '@theme': './src/theme',
          '@app-types': './src/types',
          '@utils': './src/utils',
          '@config': './src/config',
          '@features': './src/features',
          '@i18n': './src/i18n',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
