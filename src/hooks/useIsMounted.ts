import { useCallback, useEffect, useRef } from 'react'

/**
 * Returns a stable `isMounted()` getter that reports whether the component is
 * still mounted. Useful to guard state updates after an `await`/timeout so they
 * don't fire on an unmounted component.
 */
export function useIsMounted() {
  const mountedRef = useRef(false)
  const isMounted = useCallback(() => mountedRef.current, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  return isMounted
}
