import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { MAINTENANCE_SECTIONS, getMaintenanceAlerts } from '@/lib/maintenanceConfig'
import { diffFields } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useLocale } from '@/contexts/LocaleContext'
import {
  Droplets, Snowflake, Zap, Wrench, ArrowUpDown, Power, Flame,
  Home, Bug, Users, Dumbbell, Car, Save, ChevronDown, ChevronRight,
  AlertTriangle, AlertCircle, User,
} from 'lucide-react'

const ICON_MAP = {
  Droplets, Snowflake, Zap, Wrench, ArrowUpDown, Power, Flame,
  Home, Bug, Users, Dumbbell, Car,
}

export default function MaintenanceTab({ propertyId, section }) {
  const { currentUser } = useAuth()
  const { t, formatDate } = useLocale()
  const [data, setData] = useState({})
  const [originalData, setOriginalData] = useState({})
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [enabledOptional, setEnabledOptional] = useState({})
  const [dirtyKeys, setDirtyKeys] = useState(new Set())

  const docPath = `users/${currentUser.uid}/properties/${propertyId}`

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, docPath, 'maintenance', 'data'))
        if (snap.exists()) {
          const d = snap.data()
          setMeta(d._meta || {})
          const { _meta, ...rest } = d
          setData(rest)
          setOriginalData(JSON.parse(JSON.stringify(rest)))
          // Auto-enable optional sections that have data
          const enabled = {}
          for (const s of MAINTENANCE_SECTIONS) {
            if (s.optional && rest[s.key]) enabled[s.key] = true
          }
          setEnabledOptional(enabled)
        }
      } catch (err) {
        logError('[Firestore] Maintenance load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [docPath])

  // Auto-expand and scroll to section from URL param
  useEffect(() => {
    if (section && !loading) {
      setExpanded(e => ({ ...e, [section]: true }))
      // Also enable if it's an optional section
      setEnabledOptional(e => ({ ...e, [section]: true }))
      setTimeout(() => {
        const el = document.getElementById(`section-${section}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [section, loading])

  function setField(sectionKey, fieldKey, value) {
    setData(d => ({
      ...d,
      [sectionKey]: { ...(d[sectionKey] || {}), [fieldKey]: value },
    }))
    setDirtyKeys(prev => new Set(prev).add(sectionKey))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const authorName = currentUser.displayName || currentUser.email || 'Unknown'
      const updatedMeta = { ...meta }
      for (const key of dirtyKeys) {
        updatedMeta[key] = { editedBy: authorName, editedAt: now }
      }
      await setDoc(doc(db, docPath, 'maintenance', 'data'), {
        ...data,
        _meta: updatedMeta,
        updatedAt: serverTimestamp(),
      })
      // Compute field-level changes for each dirty section
      const allChanges = []
      for (const key of dirtyKeys) {
        const sec = MAINTENANCE_SECTIONS.find(s => s.key === key)
        const fieldLabels = {}
        if (sec) sec.fields.forEach(f => { fieldLabels[f.key] = f.label })
        const sectionChanges = diffFields(originalData[key], data[key], fieldLabels)
        sectionChanges.forEach(c => { c.section = sec?.label || key })
        allChanges.push(...sectionChanges)
      }
      const sectionLabels = [...dirtyKeys].map(k => MAINTENANCE_SECTIONS.find(s => s.key === k)?.label || k)
      await addDoc(collection(db, docPath, 'logs'), {
        action: 'maintenance_updated',
        author: authorName,
        details: `Updated: ${sectionLabels.join(', ')}`,
        changes: allChanges,
        timestamp: serverTimestamp(),
      })
      setMeta(updatedMeta)
      setOriginalData(JSON.parse(JSON.stringify(data)))
      setDirtyKeys(new Set())
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      logError('[Firestore] Maintenance save error:', err)
    } finally {
      setSaving(false)
    }
  }

  function toggleExpand(key) {
    setExpanded(e => ({ ...e, [key]: !e[key] }))
  }

  function toggleOptional(key) {
    setEnabledOptional(e => ({ ...e, [key]: !e[key] }))
    if (!expanded[key]) setExpanded(e => ({ ...e, [key]: true }))
  }

  const alerts = getMaintenanceAlerts(data)
  const overdueCount = alerts.filter(a => a.level === 'overdue').length
  const upcomingCount = alerts.filter(a => a.level === 'upcoming').length

  if (loading) {
    return <p className="text-sm text-muted-foreground py-12 text-center">{t('maintenance.loading')}</p>
  }

  return (
    <div className="space-y-4">
      {/* Alert summary */}
      {alerts.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              {overdueCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">{overdueCount} {t('maintenance.overdue')}</span>
                </div>
              )}
              {upcomingCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-amber-600">{upcomingCount} {t('maintenance.dueWithin30')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sections */}
      {MAINTENANCE_SECTIONS.map(section => {
        const Icon = ICON_MAP[section.icon] || Wrench
        const isExpanded = expanded[section.key]
        const isOptional = section.optional
        const isEnabled = !isOptional || enabledOptional[section.key]
        const sectionAlerts = alerts.filter(a => a.sectionKey === section.key)
        const sectionMeta = meta[section.key]

        return (
          <Card key={section.key} id={`section-${section.key}`}>
            <CardHeader
              className="cursor-pointer py-3 px-4"
              onClick={() => isEnabled ? toggleExpand(section.key) : toggleOptional(section.key)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">{section.label}</CardTitle>
                  {isOptional && !isEnabled && (
                    <Badge variant="secondary" className="text-xs">{t('maintenance.optional')}</Badge>
                  )}
                  {sectionAlerts.length > 0 && (
                    <div className="flex gap-1">
                      {sectionAlerts.some(a => a.level === 'overdue') && (
                        <Badge variant="destructive" className="text-xs">{t('maintenance.overdueLabel')}</Badge>
                      )}
                      {sectionAlerts.some(a => a.level === 'upcoming') && !sectionAlerts.some(a => a.level === 'overdue') && (
                        <Badge variant="warning" className="text-xs">{t('maintenance.dueSoonLabel')}</Badge>
                      )}
                    </div>
                  )}
                  {sectionMeta && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {sectionMeta.editedBy} &middot; {formatDate(sectionMeta.editedAt?.split('T')[0])}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isOptional && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={(e) => { e.stopPropagation(); toggleOptional(section.key) }}
                    >
                      {isEnabled ? t('maintenance.disable') : t('maintenance.enable')}
                    </Button>
                  )}
                  {isEnabled && (
                    isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>

            {isEnabled && isExpanded && (
              <CardContent className="pt-0 px-4 pb-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {section.fields.map(field => {
                    const value = data[section.key]?.[field.key] || ''
                    const fieldAlert = sectionAlerts.find(a => a.field === field.label)

                    return (
                      <div key={field.key} className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1.5">
                          {field.label}
                          {fieldAlert && (
                            fieldAlert.level === 'overdue'
                              ? <AlertCircle className="h-3 w-3 text-destructive" />
                              : <AlertTriangle className="h-3 w-3 text-amber-500" />
                          )}
                        </Label>
                        {field.type === 'select' ? (
                          <select
                            value={value}
                            onChange={e => setField(section.key, field.key, e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="">{t('common.select')}</option>
                            {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <textarea
                            value={value}
                            onChange={e => setField(section.key, field.key, e.target.value)}
                            rows={2}
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                          />
                        ) : (
                          <Input
                            type={field.type}
                            value={value}
                            onChange={e => setField(section.key, field.key, e.target.value)}
                            placeholder={field.type === 'number' ? '0' : ''}
                            className={fieldAlert ? (fieldAlert.level === 'overdue' ? 'border-destructive' : 'border-amber-400') : ''}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}

      {/* Save button */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="w-4 h-4" />
          {saving ? t('common.saving') : t('maintenance.saveMaintenance')}
        </Button>
        {saved && <span className="text-sm text-emerald-600">{t('maintenance.saved')}</span>}
      </div>
    </div>
  )
}
