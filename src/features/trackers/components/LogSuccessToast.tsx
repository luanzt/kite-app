import { StyleSheet, View } from 'react-native'
import { Toast } from 'heroui-native'
import type { ToastComponentProps } from 'heroui-native'
import { Icons } from '@features/trackers/icons'
import { useThemeColors } from '@hooks/useThemeColors'

// HeroUI's --shadow-overlay is extremely faint (≤0.03 opacity) and RN renders
// only one shadow layer, so the toast looks shadow-less. Apply a stronger,
// evenly-spread shadow via StyleSheet (a value no utility class expresses).
const toastStyles = StyleSheet.create({
  shadow: {
    shadowColor: '#1b2a4a',
    // small y offset + large radius → shadow spreads on all sides, including top
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10 // Android
  }
})

/**
 * Success toast with a leading check icon and a drop shadow. Defined at module
 * scope (not inline in toast.show) so React keeps a stable component type.
 */
export function LogSuccessToast({
  label,
  ...props
}: ToastComponentProps & { label: string }) {
  const c = useThemeColors()
  return (
    <Toast
      {...props}
      variant='success'
      style={toastStyles.shadow}
      className='flex-row items-center gap-s3'
    >
      <View className='h-[28px] w-[28px] items-center justify-center rounded-full bg-pace-on-weak'>
        <Icons.Check size={16} color={c.pace.on_track} />
      </View>
      <Toast.Title className='font-bold text-ink'>{label}</Toast.Title>
    </Toast>
  )
}

/** Minimal shape of the object returned by HeroUI's useToast(). */
type ToastApi = {
  show: (config: {
    component: (props: ToastComponentProps) => React.ReactElement
  }) => void
}

/** Show the shared "log success" toast. Pass useToast()'s `toast` + a label. */
export function showLogSuccess(toast: ToastApi, label: string): void {
  // toast API takes a render function; LogSuccessToast is a stable component.
  toast.show({
    component: (props) => <LogSuccessToast {...props} label={label} />
  })
}
