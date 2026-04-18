import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/LocaleContext'

const BUBBLE_W = 340
const PAD = 16

function computePosition(step, viewport) {
  if (!step) return null
  const el = document.querySelector(step.target)
  if (!el) {
    return { fallback: true, top: viewport.innerHeight / 2 - 100, left: viewport.innerWidth / 2 - BUBBLE_W / 2 }
  }
  const rect = el.getBoundingClientRect()
  const scrollY = viewport.scrollY
  const scrollX = viewport.scrollX

  // Prefer placement by available space unless step hints otherwise.
  const spaceBelow = viewport.innerHeight - rect.bottom
  const spaceAbove = rect.top
  const placeBelow = step.placement === 'bottom' || (step.placement !== 'top' && spaceBelow > 220)
  const top = placeBelow
    ? rect.bottom + 12 + scrollY
    : rect.top - 12 + scrollY - 220
  // Clamp left within viewport
  const centerLeft = rect.left + rect.width / 2 - BUBBLE_W / 2
  const left = Math.max(PAD + scrollX, Math.min(centerLeft + scrollX, viewport.innerWidth - BUBBLE_W - PAD + scrollX))

  return {
    top,
    left,
    spotlight: {
      top: rect.top + scrollY - 6,
      left: rect.left + scrollX - 6,
      width: rect.width + 12,
      height: rect.height + 12,
    },
  }
}

export default function TutorialBubble({ step, stepIdx, stepCount, next, back, skip, isLast, isFirst }) {
  const [pos, setPos] = useState(null)
  const { t } = useLocale()

  useEffect(() => {
    if (!step) { setPos(null); return }

    function recompute() {
      setPos(computePosition(step, {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      }))
    }

    // Scroll target into view first
    const el = document.querySelector(step.target)
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    }

    // Compute after scroll settles
    const t = setTimeout(recompute, 350)
    window.addEventListener('resize', recompute)
    window.addEventListener('scroll', recompute, { passive: true })
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', recompute)
      window.removeEventListener('scroll', recompute)
    }
  }, [step])

  if (!step || !pos) return null

  return (
    <div className="fixed inset-0 z-[200]" aria-live="polite">
      {/* Dim overlay (non-blocking so the user can still see what's highlighted) */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={skip} />

      {/* Spotlight ring around the target */}
      {pos.spotlight && (
        <div
          className="absolute border-2 border-primary rounded-lg pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
          style={{
            top: pos.spotlight.top,
            left: pos.spotlight.left,
            width: pos.spotlight.width,
            height: pos.spotlight.height,
            transition: 'all 200ms ease',
          }}
          aria-hidden="true"
        />
      )}

      {/* The bubble itself */}
      <div
        className={cn(
          'absolute bg-popover text-popover-foreground border rounded-xl shadow-2xl p-4',
          'pointer-events-auto'
        )}
        style={{ top: pos.top, left: pos.left, width: BUBBLE_W }}
        role="dialog"
        aria-labelledby="tutorial-title"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {stepIdx + 1} / {stepCount}
          </span>
          <button
            onClick={skip}
            className="cursor-pointer p-1 -m-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label={t('tutorial.skip')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <h3 id="tutorial-title" className="text-base font-semibold mb-1">{step.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>

        {/* Step dots */}
        <div className="flex items-center gap-1 mt-4">
          {Array.from({ length: stepCount }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === stepIdx ? 'w-6 bg-primary' : 'w-1.5 bg-muted'
              )}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-4">
          <Button variant="ghost" size="sm" onClick={back} disabled={isFirst} className="gap-1">
            <ChevronLeft className="w-3.5 h-3.5" /> {t('tutorial.back')}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={skip}>{t('tutorial.skip')}</Button>
            <Button size="sm" onClick={next} className="gap-1">
              {isLast ? t('tutorial.gotIt') : t('tutorial.next')}
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
