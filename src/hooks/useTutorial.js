import { useEffect, useState } from 'react'
import { useTutorialContext } from '@/contexts/TutorialContext'

/**
 * useTutorial(pageKey, steps)
 *
 * Drop into any page. When the tutorial is globally enabled AND the user
 * hasn't seen this page's tutorial yet, it starts the walkthrough after a
 * short delay (to let the page finish rendering).
 *
 * Steps whose `target` selector doesn't resolve to any element in the DOM
 * are dropped automatically — so permission-hidden buttons (e.g. "Add
 * property" for a property_manager) don't generate an orphan step pointing
 * at nothing.
 *
 * @param {string} pageKey — stable identifier for this page (persisted).
 * @param {Array<{target: string, title: string, body: string, placement?: 'top'|'bottom'|'right'|'left'}>} steps
 * @returns the current step + controls for the bubble component.
 */
export function useTutorial(pageKey, steps) {
  const { enabled, seen, markSeen } = useTutorialContext()
  const [active, setActive] = useState(false)
  const [idx, setIdx] = useState(0)
  const [visibleSteps, setVisibleSteps] = useState([])

  useEffect(() => {
    if (!enabled) { setActive(false); return }
    if (seen.includes(pageKey)) { setActive(false); return }
    if (!steps || steps.length === 0) return

    // Short retry loop so we catch elements that render slightly after the
    // page mounts (e.g. a table that waits on Firestore). Finalize once all
    // targets resolve, or after ~2.3s total, whichever comes first.
    let cancelled = false
    let attempt = 0
    const MAX_ATTEMPTS = 5

    function tryActivate() {
      if (cancelled) return
      const resolved = steps.filter(s => !s.target || !!document.querySelector(s.target))
      if (resolved.length === steps.length || attempt >= MAX_ATTEMPTS) {
        // If every target we care about is missing (likely permission-hidden
        // everywhere), skip the whole tutorial silently.
        if (resolved.length === 0) return
        setVisibleSteps(resolved)
        setIdx(0)
        setActive(true)
        return
      }
      attempt++
      setTimeout(tryActivate, 400)
    }

    const kickoff = setTimeout(tryActivate, 700)
    return () => { cancelled = true; clearTimeout(kickoff) }
  }, [enabled, seen, pageKey, steps])

  const effective = active ? visibleSteps : []
  const count = effective.length

  function next() {
    if (idx + 1 < count) { setIdx(idx + 1) }
    else { markSeen(pageKey); setActive(false); setIdx(0) }
  }

  function skip() {
    markSeen(pageKey); setActive(false); setIdx(0)
  }

  function back() {
    if (idx > 0) setIdx(idx - 1)
  }

  return {
    active,
    step: active ? effective[idx] : null,
    stepIdx: idx,
    stepCount: count,
    next,
    back,
    skip,
    isLast: idx + 1 === count,
    isFirst: idx === 0,
  }
}
