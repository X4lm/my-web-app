import { useLocale } from '@/contexts/LocaleContext'
import AppLayout from '@/components/AppLayout'
import MessageTemplates from '@/components/MessageTemplates'

export default function TemplatesPage() {
  const { t } = useLocale()
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('messagesPage.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('messagesPage.subtitle')}
          </p>
        </div>
        <MessageTemplates />
      </div>
    </AppLayout>
  )
}
