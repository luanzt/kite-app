import Svg, { Rect, Path, G } from 'react-native-svg'

/**
 * Kite brand mark (from the design handoff thumbnail): a rounded brand-green
 * tile with a white diamond kite, cross struts, and a wavy tail. Rendered with
 * react-native-svg so it's crisp at any size — replaces the faint 🪁 emoji.
 */
export function KiteLogo({ size = 56 }: { size?: number }) {
  const radius = size * 0.26
  return (
    <Svg width={size} height={size} viewBox='0 0 100 100'>
      <Rect width={100} height={100} rx={radius} ry={radius} fill='#2e7d5b' />
      <G transform='translate(50 46)'>
        <Path d='M0 -22 L18 0 L0 22 L-18 0 Z' fill='#ffffff' />
        <Path
          d='M0 -22 L0 22 M-18 0 L18 0'
          stroke='#2e7d5b'
          strokeWidth={2}
          fill='none'
        />
        <Path
          d='M0 22 L-4 34 M0 22 L4 32 M0 22 L0 36'
          stroke='#ffffff'
          strokeWidth={2}
          fill='none'
          strokeLinecap='round'
        />
      </G>
    </Svg>
  )
}
