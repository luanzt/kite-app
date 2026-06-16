import NoDataImg from '@assets/images/img_no_data.svg'

/**
 * No-data illustration (src/assets/images/img_no_data.svg) — a kite drifting
 * over an empty horizon, shown in empty states. The SVG file is imported
 * directly as a component (via react-native-svg-transformer), so editing the
 * file updates this everywhere. Its viewBox is 320×250; the `size` prop sets
 * the width and the height follows that aspect ratio.
 */
const ASPECT = 250 / 320

export function NoData({ size = 220 }: { size?: number }) {
  return <NoDataImg width={size} height={size * ASPECT} />
}
