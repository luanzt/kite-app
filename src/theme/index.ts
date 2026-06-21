import type { HeroUINativeConfig } from 'heroui-native'

/**
 * HeroUI config. `topInset` is the device safe-area top (from
 * useSafeAreaInsets) — toasts render in a full-window overlay where the top
 * inset isn't applied automatically, so we pass it in here (+ a little gap) so
 * a top-placed toast sits below the notch with its shadow visible.
 */
export function makeHeroUIConfig(topInset: number): HeroUINativeConfig {
  return {
    textProps: {
      allowFontScaling: true,
      maxFontSizeMultiplier: 1.3
    },
    devInfo: {
      stylingPrinciples: false
    },
    toast: {
      defaultProps: {
        variant: 'default',
        placement: 'top'
      },
      insets: { top: topInset + 12 },
      maxVisibleToasts: 3
    }
  }
}
