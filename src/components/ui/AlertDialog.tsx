import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Button, Dialog } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { Icons } from '@features/trackers/icons'

/** Options accepted by the imperative `alert(...)` function. */
export type AlertOptions = {
  title: string
  message?: string
  /** `danger` colors the confirm button red. Defaults to `default` (primary). */
  variant?: 'default' | 'danger'
  /**
   * Confirm (OK) button. It is HIDDEN by default — the corner close (X) button
   * always dismisses the dialog. Pass `onConfirm` and/or `confirmLabel` to show
   * an OK button (e.g. for confirm prompts that need an action callback).
   */
  confirmLabel?: string
  onConfirm?: () => void
  /** When provided, a second (Cancel) button is shown — i.e. a confirm dialog. */
  cancelLabel?: string
  onCancel?: () => void
}

type AlertFn = (options: AlertOptions) => void

const AlertContext = createContext<AlertFn | null>(null)

/**
 * Imperative alert/confirm dialog provider. Mount once near the app root
 * (inside `HeroUINativeProvider`). Any descendant can then call
 * `const alert = useAlert(); alert({ title, message })` to show a single,
 * centered HeroUI `Dialog` — no per-screen `isOpen` state needed.
 *
 * Mirrors HeroUI's own `useToast` ergonomics. Built as a shared primitive
 * because validation errors and confirm prompts ("Delete tracker?") recur
 * across the app.
 */
export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<AlertOptions | null>(null)
  // Hold the latest options across the close animation so the dialog keeps its
  // text while fading out (clearing immediately would blank it mid-exit).
  const lastOpts = useRef<AlertOptions | null>(null)

  const alert = useCallback<AlertFn>((options) => {
    lastOpts.current = options
    setOpts(options)
    setOpen(true)
  }, [])

  const close = useCallback(() => setOpen(false), [])

  const onConfirm = useCallback(() => {
    lastOpts.current?.onConfirm?.()
    close()
  }, [close])

  const onCancel = useCallback(() => {
    lastOpts.current?.onCancel?.()
    close()
  }, [close])

  const isDanger = opts?.variant === 'danger'
  const hasCancel = !!opts?.cancelLabel
  // OK is opt-in: shown only when a callback or a custom label is provided.
  const hasConfirm = !!opts?.onConfirm || !!opts?.confirmLabel
  const hasFooter = hasCancel || hasConfirm

  return (
    <AlertContext.Provider value={alert}>
      {children}
      <Dialog isOpen={open} onOpenChange={setOpen}>
        {/* `disableFullWindowOverlay`: render inline instead of an iOS
            FullWindowOverlay native window. That window collapsed to zero size
            here (it broke the Toast the same way); the dialog is a centered
            modal with nothing native above it, so inline rendering is correct. */}
        <Dialog.Portal disableFullWindowOverlay>
          <Dialog.Overlay className='bg-black/60' />
          <Dialog.Content>
            {/* Corner close (X) — always present, so the dialog is dismissable
                even when no footer button is shown. */}
            <Pressable
              onPress={close}
              hitSlop={8}
              accessibilityRole='button'
              accessibilityLabel={t('common.close')}
              className='absolute right-s3 top-s3 z-10 h-8 w-8 items-center justify-center rounded-full active:opacity-60'
            >
              <Icons.Close size={24} color='#8a8e80' />
            </Pressable>
            <View className='mb-s4 gap-s2 pr-s6'>
              <Dialog.Title className='text-lg font-bold text-ink'>
                {opts?.title ?? ''}
              </Dialog.Title>
              {opts?.message ? (
                <Dialog.Description className='text-base text-ink-2'>
                  {opts.message}
                </Dialog.Description>
              ) : null}
            </View>
            {hasFooter ? (
              <View className='flex-row justify-end gap-s3'>
                {hasCancel ? (
                  <Button variant='ghost' size='sm' onPress={onCancel}>
                    <Button.Label>{opts?.cancelLabel}</Button.Label>
                  </Button>
                ) : null}
                {hasConfirm ? (
                  <Button
                    variant={isDanger ? 'danger' : 'primary'}
                    size='sm'
                    onPress={onConfirm}
                  >
                    <Button.Label>
                      {opts?.confirmLabel ?? t('common.ok')}
                    </Button.Label>
                  </Button>
                ) : null}
              </View>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </AlertContext.Provider>
  )
}

/**
 * Returns the imperative `alert(options)` function. Throws if used outside an
 * `AlertProvider` (matches HeroUI's `useToast` contract).
 */
export function useAlert(): AlertFn {
  const ctx = useContext(AlertContext)
  if (!ctx) {
    throw new Error('useAlert must be used within an AlertProvider')
  }
  return ctx
}
