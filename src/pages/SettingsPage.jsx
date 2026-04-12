import { useState } from 'react'
import { logError } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import AppLayout from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/firebase/config'

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

export default function SettingsPage() {
  const { currentUser } = useAuth()
  const { settings, updateSettings, formatCurrency, formatDate, formatWithConversion, t, CURRENCIES, DATE_FORMATS, LANGUAGES, CALENDAR_SYSTEMS } = useLocale()
  const [name, setName] = useState(currentUser?.displayName || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetSending, setResetSending] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await updateProfile(auth.currentUser, { displayName: name })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      logError('[Settings] Update failed:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('settings.subtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('settings.profile')}</CardTitle>
            <CardDescription>{t('settings.profileDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-name">{t('settings.displayName')}</Label>
                <Input
                  id="display-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('settings.namePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.email')}</Label>
                <Input value={currentUser?.email || ''} disabled />
                <p className="text-xs text-muted-foreground">{t('settings.emailNoChange')}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? t('settings.sending') : t('settings.saveChanges')}
                </Button>
                {saved && <span className="text-sm text-emerald-600">Saved!</span>}
              </div>
            </form>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('settings.account')}</CardTitle>
            <CardDescription>{t('settings.accountDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('settings.accountId')}</p>
                <p className="text-xs text-muted-foreground font-mono">{currentUser?.uid}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('settings.password')}</p>
                <p className="text-xs text-muted-foreground">{t('settings.passwordDesc')}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={resetSending}
                  onClick={async () => {
                    setResetSending(true)
                    setResetSent(false)
                    try {
                      await sendPasswordResetEmail(auth, currentUser.email)
                      setResetSent(true)
                      setTimeout(() => setResetSent(false), 5000)
                    } catch (err) {
                      logError('[Settings] Password reset error:', err)
                    } finally {
                      setResetSending(false)
                    }
                  }}
                >
                  {resetSending ? t('settings.sending') : t('settings.resetPassword')}
                </Button>
                {resetSent && <span className="text-sm text-emerald-600">{t('settings.emailSent')}</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('settings.currencyLocale')}</CardTitle>
            <CardDescription>{t('settings.currencyLocaleDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="currency">{t('settings.currency')}</Label>
                <select
                  id="currency"
                  value={settings.currency}
                  onChange={e => updateSettings({ currency: e.target.value })}
                  className={SELECT_CLASS}
                >
                  {Object.entries(CURRENCIES).map(([code, { symbol, name }]) => (
                    <option key={code} value={code}>{symbol} — {name} ({code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-format">{t('settings.dateFormat')}</Label>
                <select
                  id="date-format"
                  value={settings.dateFormat}
                  onChange={e => updateSettings({ dateFormat: e.target.value })}
                  className={SELECT_CLASS}
                >
                  {Object.entries(DATE_FORMATS).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">{t('settings.language')}</Label>
                <select
                  id="language"
                  value={settings.language || 'en'}
                  onChange={e => updateSettings({ language: e.target.value })}
                  className={SELECT_CLASS}
                >
                  {Object.entries(LANGUAGES).map(([code, { label }]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="calendar">{t('settings.calendar')}</Label>
                <select
                  id="calendar"
                  value={settings.calendar || 'gregorian'}
                  onChange={e => updateSettings({ calendar: e.target.value })}
                  className={SELECT_CLASS}
                >
                  {Object.entries(CALENDAR_SYSTEMS).map(([key, { label, labelAr }]) => (
                    <option key={key} value={key}>
                      {(settings.language === 'ar' ? labelAr : label)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {settings.calendar === 'hijri'
                    ? t('settings.calendarHijri')
                    : settings.calendar === 'both'
                    ? t('settings.calendarBoth')
                    : t('settings.calendarGregorian')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary-currency">{t('settings.secondaryCurrency')}</Label>
                <select
                  id="secondary-currency"
                  value={settings.secondaryCurrency || ''}
                  onChange={e => updateSettings({ secondaryCurrency: e.target.value })}
                  className={SELECT_CLASS}
                >
                  <option value="">None</option>
                  {Object.entries(CURRENCIES)
                    .filter(([code]) => code !== settings.currency)
                    .map(([code, { symbol, name }]) => (
                      <option key={code} value={code}>{symbol} — {name} ({code})</option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {t('settings.secondaryCurrencyDesc')}
                </p>
              </div>
            </div>

            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              <p className="font-medium mb-1">{t('settings.preview')}</p>
              <p>{t('settings.previewAmount')}: <span className="text-foreground font-medium">{formatWithConversion(350000)}</span></p>
              <p>{t('settings.previewDate')}: <span className="text-foreground font-medium">{formatDate('2025-03-15')}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
