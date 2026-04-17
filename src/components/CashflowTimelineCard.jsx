import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale } from '@/contexts/LocaleContext'
import { buildCashflowTimeline } from '@/utils/visibility'

export default function CashflowTimelineCard({ cheques = [], expenses = [] }) {
  const { t, formatCurrency } = useLocale()
  const data = useMemo(() => buildCashflowTimeline({ cheques, expenses }), [cheques, expenses])

  const maxAbs = Math.max(
    ...data.map(d => Math.max(d.inflow, d.outflow)),
    1
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{t('cashflow.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-5 text-xs">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> {t('cashflow.inflow')}</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> {t('cashflow.outflow')}</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary" /> {t('cashflow.net')}</div>
        </div>

        <div className="overflow-x-auto">
          <div className="flex items-end gap-2 min-w-[700px]" style={{ height: 200 }}>
            {data.map(m => {
              const inH = (m.inflow / maxAbs) * 170
              const outH = (m.outflow / maxAbs) * 170
              const isFuture = m.offset > 0
              const isPast = m.offset < 0
              return (
                <div key={m.monthKey} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex items-end gap-0.5 h-[170px] w-full">
                    <div className="flex-1 flex items-end">
                      <div
                        title={`${t('cashflow.inflow')}: ${formatCurrency(m.inflow)}`}
                        className={`w-full rounded-t-sm ${isFuture ? 'bg-green-500/40' : 'bg-green-500'} transition-all`}
                        style={{ height: `${inH}px` }}
                      />
                    </div>
                    <div className="flex-1 flex items-end">
                      <div
                        title={`${t('cashflow.outflow')}: ${formatCurrency(m.outflow)}`}
                        className={`w-full rounded-t-sm ${isFuture ? 'bg-red-500/40' : 'bg-red-500'} transition-all`}
                        style={{ height: `${outH}px` }}
                      />
                    </div>
                  </div>
                  <div className={`text-[10px] font-medium uppercase tracking-wider ${m.offset === 0 ? 'text-primary' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                    {m.monthLabel}
                  </div>
                  <div className={`text-[11px] font-bold ${m.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {m.net >= 0 ? '+' : ''}{formatCurrency(m.net)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
