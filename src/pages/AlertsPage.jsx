import { usePropertyAlerts } from '@/hooks/usePropertyAlerts'
import { usePortfolioAggregates } from '@/hooks/usePortfolioAggregates'
import { useLocale } from '@/contexts/LocaleContext'
import AppLayout from '@/components/AppLayout'
import AlertsPanel from '@/components/AlertsPanel'
import ExpenseAnomaliesCard from '@/components/ExpenseAnomaliesCard'

export default function AlertsPage() {
  const { properties, allAlerts, loading } = usePropertyAlerts()
  const { expenses } = usePortfolioAggregates(properties)
  const { t } = useLocale()

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('alerts.title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('alerts.subtitle')}
          </p>
        </div>

        <ExpenseAnomaliesCard expenses={expenses} />

        {loading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">{t('alerts.loading')}</p>
        ) : (
          <AlertsPanel alerts={allAlerts} title={t('alerts.allAlerts')} maxItems={50} />
        )}
      </div>
    </AppLayout>
  )
}
