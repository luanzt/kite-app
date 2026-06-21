/**
 * React Native CLI config. `assets` lists folders whose fonts get copied into
 * the native projects by `npx react-native-asset` (iOS Info.plist UIAppFonts +
 * Android app/src/main/assets/fonts). Re-run that command and do a native
 * rebuild after adding/removing fonts — a Metro reload is not enough.
 */
module.exports = {
  assets: ['./assets/fonts']
}
