import { Image } from 'react-native'

const logoSource = require('@assets/images/logo_app.png')

/**
 * Kite brand mark — renders the app logo PNG (src/assets/images/logo_app.png)
 * in a rounded tile so it reads as an app icon. The `size` prop drives both
 * width and height; corner radius scales with it. Replaces the earlier
 * hand-drawn react-native-svg kite.
 */
export function KiteLogo({ size = 56 }: { size?: number }) {
  return (
    <Image
      source={logoSource}
      // width/height/radius all derive from the runtime `size` arg — genuinely
      // per-call dynamic, so no fixed Tailwind class can express it
      style={{ width: size, height: size, borderRadius: size * 0.26 }}
      resizeMode='cover'
    />
  )
}
