import { usePropertyAlerts } from '@/hooks/usePropertyAlerts'
import { useLocale } from '@/contexts/LocaleContext'
import AppLayout from '@/components/AppLayout'
import AlertsPanel from '@/components/AlertsPanel'

export default function AlertsPage() {
  const { allAlerts, loading } = usePropertyAlerts()
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

        {loading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">{t('alerts.loading')}</p>
        ) : (
          <AlertsPanel alerts={allAlerts} title={t('alerts.allAlerts')} maxItems={50} />
        )}
      </div>
    </AppLayout>
  )
}
