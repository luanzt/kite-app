import { Typography } from 'heroui-native'

/** A bold form field label (matches the design's `.field-label`). */
export function FieldLabel({ children }: { children: string }) {
  return (
    <Typography className='text-sm font-bold text-ink'>{children}</Typography>
  )
}
