import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale } from '@/contexts/LocaleContext'
import { detectExpenseAnomalies } from '@/utils/visibility'
import { formatDate } from '@/lib/utils'

const CATEGORY_LABELS = {
  maintenance: 'Maintenance', repair: 'Repair', utilities: 'Utilities',
  insurance: 'Insurance', cleaning: 'Cleaning', management: 'Management', other: 'Other',
}

export default function ExpenseAnomaliesCard({ expenses = [] }) {
  const { t, formatCurrency } = useLocale()
  const anomalies = useMemo(() => detectExpenseAnomalies(expenses), [expenses])

  if (anomalies.length === 0) return null

  return (
    <Card className="border-orange-500/30">
      <CardHeader className="flex flex-row items-center gap-2 py-3">
        <div className="w-8 h-8 rounded-md bg-orange-500/15 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-orange-500" />
        </div>
        <div>
          <CardTitle className="text-sm font-semibold">{t('anomaly.title')}</CardTitle>
          <p className="text-xs text-muted-foreground">{t('anomaly.subtitle')}</p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y border-t">
          {anomalies.map(a => (
            <li key={a.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.description || CATEGORY_LABELS[a.category] || a.category}</p>
                <p className="text-xs text-muted-foreground truncate">
                  <Link to={`/properties/${a.propertyId}`} className="hover:underline">{a.propertyName}</Link>
                  {' · '}{CATEGORY_LABELS[a.category] || a.category}
                  {' · '}{formatDate(a.date)}
                </p>
              </div>
              <div className="text-end">
                <p className="text-sm font-bold text-orange-500">{formatCurrency(a.cost)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {a.multiplier.toFixed(1)}{t('anomaly.multiplier')} · {t('anomaly.baseline')} {formatCurrency(a.baseline)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
