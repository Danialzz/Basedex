import * as React from 'react'

const MOBILE_BREAKPOINT = 768

const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  // useSyncExternalStore is the correct hook for subscribing to external,
  // browser-held state like a media query — no setState-in-effect needed.
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
