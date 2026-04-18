import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/LocaleContext'

/**
 * PropertyHealthBadge — renders the 0-100 health score as a colored
 * circular ring with the grade letter inside.
 * Supports a `breakdown` prop to show a tooltip with the score components.
 */
export default function PropertyHealthBadge({ score, grade, tone, breakdown, size = 'md', className = '' }) {
  const { t } = useLocale()
  const dims = size === 'sm' ? 'w-9 h-9 text-[10px]' : size === 'lg' ? 'w-14 h-14 text-sm' : 'w-11 h-11 text-[11px]'
  const trackColor = {
    green: 'text-green-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
  }[tone] || 'text-muted-foreground'

  const circumference = 2 * Math.PI * 18
  const offset = circumference * (1 - score / 100)

  // Plain-text breakdown used for the native tooltip
  const tooltipLines = [`${t('health.title')}: ${score}/100${grade ? ` (${grade})` : ''}`]
  if (breakdown) {
    const rows = [
      ['occupancy', 25],
      ['rent', 25],
      ['maintenance', 20],
      ['documents', 10],
      ['turnover', 10],
      ['alerts', 10],
    ]
    rows.forEach(([key, max]) => {
      const val = breakdown[key]
      if (typeof val === 'number') tooltipLines.push(`${t(`health.${key}`)}: ${val}/${max}`)
    })
  }
  const tooltip = tooltipLines.join('\n')
  const ariaLabel = `${t('health.title')} ${score} / 100`

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', dims, className)}
      role="img"
      aria-label={ariaLabel}
      title={tooltip}
      tabIndex={0}
    >
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
        <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/40" />
        <circle
          cx="22" cy="22" r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(trackColor, 'transition-all duration-500')}
        />
      </svg>
      <div className="flex flex-col items-center leading-none">
        <span className={cn('font-bold', trackColor)}>{score}</span>
        {size !== 'sm' && <span className="text-[8px] font-semibold text-muted-foreground">{grade}</span>}
      </div>
    </div>
  )
}
