import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale } from '@/contexts/LocaleContext'
import { buildOccupancyForecast } from '@/utils/visibility'

export default function OccupancyForecastCard({ units = [] }) {
  const { t } = useLocale()
  const data = useMemo(() => buildOccupancyForecast({ units }), [units])

  if (data.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{t('forecast.title')}</CardTitle>
        <p className="text-xs text-muted-foreground">{t('forecast.subtitle')}</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2" style={{ height: 140 }}>
          {data.map((m, i) => {
            const h = m.rate * 120
            const tone = m.rate >= 0.9 ? 'bg-green-500' : m.rate >= 0.7 ? 'bg-amber-500' : 'bg-red-500'
            const isNow = i === 0
            return (
              <div key={m.monthKey} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="text-[11px] font-bold tabular-nums">
                  {Math.round(m.rate * 100)}%
                </div>
                <div className="w-full flex items-end h-[120px]">
                  <div
                    className={`w-full rounded-t-md ${tone} ${isNow ? 'opacity-100' : 'opacity-70'} transition-all`}
                    style={{ height: `${Math.max(h, 6)}px` }}
                    title={`${m.occupied}/${m.total} units`}
                  />
                </div>
                <div className={`text-[10px] uppercase tracking-wider ${isNow ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  {m.monthLabel}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
