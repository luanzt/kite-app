const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { withUniwindConfig } = require('uniwind/metro')
const {
  wrapWithReanimatedMetroConfig
} = require('react-native-reanimated/metro-config')

const defaultConfig = getDefaultConfig(__dirname)

const config = {}

module.exports = withUniwindConfig(
  wrapWithReanimatedMetroConfig(mergeConfig(defaultConfig, config)),
  {
    cssEntryFile: './global.css',
    dtsFile: './src/uniwind.d.ts'
  }
)
