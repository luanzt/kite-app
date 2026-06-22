import { useEffect, useRef } from 'react'
import type { DependencyList, EffectCallback } from 'react'

/**
 * Like `useEffect`, but skips the initial mount — the effect only runs on
 * subsequent dependency changes (an "on update" effect). Handy for reacting to
 * a value changing without firing once on first render.
 */
export function useDidUpdateEffect(
  effect: EffectCallback,
  deps?: DependencyList
) {
  const didMountRef = useRef(false)

  useEffect(() => {
    if (didMountRef.current) {
      return effect()
    }
    didMountRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
