import { usePropertyAlerts } from '@/hooks/usePropertyAlerts'
import AppLayout from '@/components/AppLayout'
import AlertsPanel from '@/components/AlertsPanel'

export default function AlertsPage() {
  const { allAlerts, loading } = usePropertyAlerts()

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground text-sm">
            View all overdue and upcoming alerts across your properties.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading alerts...</p>
        ) : (
          <AlertsPanel alerts={allAlerts} title="All Property Alerts" maxItems={50} />
        )}
      </div>
    </AppLayout>
  )
}
