import { useEffect, useState } from 'react'
import { useTutorialContext } from '@/contexts/TutorialContext'

/**
 * useTutorial(pageKey, steps)
 *
 * Drop into any page. When the tutorial is globally enabled AND the user
 * hasn't seen this page's tutorial yet, it starts the walkthrough after a
 * short delay (to let the page finish rendering).
 *
 * @param {string} pageKey — stable identifier for this page (persisted).
 * @param {Array<{target: string, title: string, body: string, placement?: 'top'|'bottom'|'right'|'left'}>} steps
 * @returns the current step + controls for the bubble component.
 */
export function useTutorial(pageKey, steps) {
  const { enabled, seen, markSeen } = useTutorialContext()
  const [active, setActive] = useState(false)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (!enabled) { setActive(false); return }
    if (seen.includes(pageKey)) { setActive(false); return }
    if (!steps || steps.length === 0) return
    // Wait a tick for the page to mount + data to render.
    const timer = setTimeout(() => { setIdx(0); setActive(true) }, 700)
    return () => clearTimeout(timer)
  }, [enabled, seen, pageKey, steps])

  function next() {
    if (idx + 1 < steps.length) { setIdx(idx + 1) }
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
    step: active ? steps[idx] : null,
    stepIdx: idx,
    stepCount: steps?.length || 0,
    next,
    back,
    skip,
    isLast: idx + 1 === (steps?.length || 0),
    isFirst: idx === 0,
  }
}
