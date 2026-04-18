import { createContext, useContext, useState, useCallback } from 'react'

const TutorialContext = createContext(null)

const LS_ENABLED = 'tutorialEnabled'
const LS_SEEN = 'tutorialSeen'

function readLS() {
  try {
    const enabledRaw = localStorage.getItem(LS_ENABLED)
    const enabled = enabledRaw === null ? true : enabledRaw === 'true'
    const seen = JSON.parse(localStorage.getItem(LS_SEEN) || '[]')
    return { enabled, seen: Array.isArray(seen) ? seen : [] }
  } catch {
    return { enabled: true, seen: [] }
  }
}

export function TutorialProvider({ children }) {
  const [state, setState] = useState(readLS)

  const toggle = useCallback(() => {
    setState(prev => {
      const enabled = !prev.enabled
      // When re-enabling, clear the seen list so tutorials play again.
      const seen = enabled ? [] : prev.seen
      try {
        localStorage.setItem(LS_ENABLED, String(enabled))
        localStorage.setItem(LS_SEEN, JSON.stringify(seen))
      } catch { /* no-op */ }
      return { enabled, seen }
    })
  }, [])

  const markSeen = useCallback((pageKey) => {
    setState(prev => {
      if (prev.seen.includes(pageKey)) return prev
      const seen = [...prev.seen, pageKey]
      try { localStorage.setItem(LS_SEEN, JSON.stringify(seen)) } catch { /* no-op */ }
      return { ...prev, seen }
    })
  }, [])

  // Force-restart a single page's tutorial (e.g. "show me again" button).
  const restart = useCallback((pageKey) => {
    setState(prev => {
      const seen = prev.seen.filter(k => k !== pageKey)
      try { localStorage.setItem(LS_SEEN, JSON.stringify(seen)) } catch { /* no-op */ }
      return { ...prev, seen }
    })
  }, [])

  const reset = useCallback(() => {
    setState(prev => {
      try { localStorage.setItem(LS_SEEN, '[]') } catch { /* no-op */ }
      return { ...prev, seen: [] }
    })
  }, [])

  const value = {
    enabled: state.enabled,
    seen: state.seen,
    toggle,
    markSeen,
    restart,
    reset,
  }

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>
}

export function useTutorialContext() {
  const ctx = useContext(TutorialContext)
  if (!ctx) throw new Error('useTutorialContext must be used inside TutorialProvider')
  return ctx
}
