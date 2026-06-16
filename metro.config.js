const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { withUniwindConfig } = require('uniwind/metro')
const {
  wrapWithReanimatedMetroConfig
} = require('react-native-reanimated/metro-config')

const defaultConfig = getDefaultConfig(__dirname)

const config = {}

// Compose: reanimated -> uniwind -> svg-transformer. Uniwind returns the final
// config (it sets its own transformerPath whose worker still honors
// transformer.babelTransformerPath), so we layer the SVG transformer on top of
// its result and move `svg` from assetExts to sourceExts so `.svg` files import
// as React components instead of static assets.
const baseConfig = withUniwindConfig(
  wrapWithReanimatedMetroConfig(mergeConfig(defaultConfig, config)),
  {
    cssEntryFile: './global.css',
    dtsFile: './src/uniwind.d.ts'
  }
)

module.exports = {
  ...baseConfig,
  transformer: {
    ...baseConfig.transformer,
    babelTransformerPath: require.resolve(
      'react-native-svg-transformer/react-native'
    )
  },
  resolver: {
    ...baseConfig.resolver,
    assetExts: baseConfig.resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...baseConfig.resolver.sourceExts, 'svg']
  }
}
