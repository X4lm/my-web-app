import AppLayout from '@/components/AppLayout'
import MessageTemplates from '@/components/MessageTemplates'

export default function MessagesPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Message Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage reusable message templates for tenant and vendor communications.
          </p>
        </div>
        <MessageTemplates />
      </div>
    </AppLayout>
  )
}
