import type { HeroUINativeConfig } from 'heroui-native'

export const heroUIConfig: HeroUINativeConfig = {
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
    maxVisibleToasts: 3
  }
}
