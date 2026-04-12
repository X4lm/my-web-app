import { useState, useEffect } from 'react'
import {
  collection, addDoc, doc, getDoc, setDoc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  ClipboardCheck, Plus, Save, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight, User,
} from 'lucide-react'

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

const INSPECTION_SECTIONS = [
  {
    key: 'exterior',
    label: 'Exterior & Common Areas',
    items: [
      { key: 'building_facade', label: 'Building facade condition' },
      { key: 'parking', label: 'Parking area' },
      { key: 'landscaping', label: 'Landscaping & gardens' },
      { key: 'entrance', label: 'Main entrance & lobby' },
      { key: 'corridors', label: 'Hallways & corridors' },
      { key: 'stairways', label: 'Stairways & railings' },
      { key: 'elevators', label: 'Elevators' },
    ],
  },
  {
    key: 'safety',
    label: 'Safety & Compliance',
    items: [
      { key: 'fire_extinguishers', label: 'Fire extinguishers' },
      { key: 'smoke_detectors', label: 'Smoke detectors' },
      { key: 'emergency_exits', label: 'Emergency exits & signage' },
      { key: 'fire_alarm', label: 'Fire alarm system' },
      { key: 'cctv', label: 'CCTV cameras' },
      { key: 'first_aid', label: 'First aid kits' },
    ],
  },
  {
    key: 'utilities',
    label: 'Utilities & Systems',
    items: [
      { key: 'electrical_panels', label: 'Electrical panels' },
      { key: 'water_supply', label: 'Water supply & pressure' },
      { key: 'drainage', label: 'Drainage & sewage' },
      { key: 'ac_system', label: 'AC / HVAC system' },
      { key: 'water_tanks', label: 'Water tanks' },
      { key: 'generator', label: 'Backup generator' },
    ],
  },
  {
    key: 'cleanliness',
    label: 'Cleanliness & Hygiene',
    items: [
      { key: 'common_areas_clean', label: 'Common areas cleanliness' },
      { key: 'waste_disposal', label: 'Waste disposal & bins' },
      { key: 'pest_signs', label: 'Signs of pests' },
      { key: 'restrooms', label: 'Common restrooms' },
    ],
  },
]

const CONDITION_OPTIONS = [
  { value: '', tKey: 'inspection.notInspected' },
  { value: 'good', tKey: 'inspection.conditionGood' },
  { value: 'fair', tKey: 'inspection.conditionFair' },
  { value: 'poor', tKey: 'inspection.conditionPoor' },
  { value: 'critical', tKey: 'inspection.conditionCritical' },
  { value: 'na', tKey: 'inspection.conditionNA' },
]

const CONDITION_COLORS = {
  good: 'text-emerald-600',
  fair: 'text-amber-600',
  poor: 'text-orange-600',
  critical: 'text-destructive',
  na: 'text-muted-foreground',
}

export default function InspectionTab({ propertyId }) {
  const { currentUser } = useAuth()
  const { t, formatDate, formatDateTime } = useLocale()
  const [data, setData] = useState({})
  const [notes, setNotes] = useState({})
  const [lastInspection, setLastInspection] = useState(null)
  const [inspections, setInspections] = useState([])
  const [expanded, setExpanded] = useState({ exterior: true })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const docPath = `users/${currentUser.uid}/properties/${propertyId}`

  // Load previous inspections
  useEffect(() => {
    const q = query(collection(db, docPath, 'inspections'), orderBy('date', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setInspections(list)
      if (list.length > 0) setLastInspection(list[0])
    })
    return unsub
  }, [docPath])

  function setItem(sectionKey, itemKey, value) {
    setData(d => ({
      ...d,
      [`${sectionKey}.${itemKey}`]: value,
    }))
    setSaved(false)
  }

  function setNote(sectionKey, itemKey, value) {
    setNotes(n => ({
      ...n,
      [`${sectionKey}.${itemKey}`]: value,
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const inspectionData = {
        data: { ...data },
        notes: { ...notes },
        date: new Date().toISOString(),
        inspector: currentUser.displayName || currentUser.email || 'Unknown',
        createdAt: serverTimestamp(),
      }

      // Compute summary
      const values = Object.values(data).filter(v => v && v !== 'na')
      const critical = values.filter(v => v === 'critical').length
      const poor = values.filter(v => v === 'poor').length
      const good = values.filter(v => v === 'good').length
      inspectionData.summary = { total: values.length, good, poor, critical }

      await addDoc(collection(db, docPath, 'inspections'), inspectionData)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      logError('[Inspection] Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  function toggleExpand(key) {
    setExpanded(e => ({ ...e, [key]: !e[key] }))
  }

  // Count items by condition
  const allValues = Object.values(data).filter(v => v && v !== 'na')
  const totalInspected = allValues.length
  const criticalCount = allValues.filter(v => v === 'critical').length
  const poorCount = allValues.filter(v => v === 'poor').length

  return (
    <div className="space-y-4">
      {/* Last inspection info */}
      {lastInspection && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ClipboardCheck className="w-4 h-4" />
                <span>{t('inspection.lastInspection')}: <span className="font-medium text-foreground">{formatDateTime(lastInspection.createdAt)}</span></span>
                <span>&middot;</span>
                <User className="w-3 h-3" />
                <span>{lastInspection.inspector}</span>
              </div>
              {lastInspection.summary && (
                <div className="flex gap-2">
                  {lastInspection.summary.critical > 0 && (
                    <Badge variant="destructive" className="text-xs">{lastInspection.summary.critical} {t('inspection.critical')}</Badge>
                  )}
                  {lastInspection.summary.poor > 0 && (
                    <Badge variant="warning" className="text-xs">{lastInspection.summary.poor} {t('inspection.poor')}</Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">{lastInspection.summary.total} {t('inspection.inspected')}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current progress */}
      {totalInspected > 0 && (
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <span className="text-muted-foreground">{totalInspected} {t('inspection.itemsInspected')}</span>
          {criticalCount > 0 && <Badge variant="destructive">{criticalCount} {t('inspection.critical')}</Badge>}
          {poorCount > 0 && <Badge variant="warning">{poorCount} {t('inspection.poor')}</Badge>}
        </div>
      )}

      {/* Inspection sections */}
      {INSPECTION_SECTIONS.map(section => {
        const isExpanded = expanded[section.key]
        const sectionItems = section.items.map(item => data[`${section.key}.${item.key}`] || '')
        const inspectedCount = sectionItems.filter(v => v).length
        const sectionCritical = sectionItems.filter(v => v === 'critical').length

        return (
          <Card key={section.key}>
            <CardHeader
              className="cursor-pointer py-3 px-4"
              onClick={() => toggleExpand(section.key)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-sm font-medium">{section.label}</CardTitle>
                  <span className="text-xs text-muted-foreground">{inspectedCount}/{section.items.length}</span>
                  {sectionCritical > 0 && <Badge variant="destructive" className="text-xs">{sectionCritical} {t('inspection.critical')}</Badge>}
                </div>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="pt-0 px-4 pb-4">
                <div className="space-y-3">
                  {section.items.map(item => {
                    const key = `${section.key}.${item.key}`
                    const value = data[key] || ''
                    const note = notes[key] || ''
                    return (
                      <div key={item.key} className="flex items-start gap-3 py-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.label}</p>
                          {value && value !== 'na' && (
                            <Input
                              value={note}
                              onChange={e => setNote(section.key, item.key, e.target.value)}
                              placeholder={t('inspection.addNote')}
                              className="mt-1 h-7 text-xs"
                            />
                          )}
                        </div>
                        <select
                          value={value}
                          onChange={e => setItem(section.key, item.key, e.target.value)}
                          className={`h-8 rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring w-28 ${CONDITION_COLORS[value] || ''}`}
                        >
                          {CONDITION_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{t(o.tKey)}</option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving || totalInspected === 0} size="sm">
          <Save className="w-4 h-4" />
          {saving ? t('common.saving') : t('inspection.saveInspection')}
        </Button>
        {saved && <span className="text-sm text-emerald-600">{t('inspection.inspectionSaved')}</span>}
      </div>

      {/* Previous inspections */}
      {inspections.length > 1 && (
        <>
          <Separator />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t('inspection.previousInspections')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {inspections.slice(1, 6).map(insp => (
                  <div key={insp.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      <span>{formatDateTime(insp.createdAt)}</span>
                      <span>&middot;</span>
                      <span>{insp.inspector}</span>
                    </div>
                    {insp.summary && (
                      <div className="flex gap-1">
                        {insp.summary.critical > 0 && <Badge variant="destructive" className="text-[10px]">{insp.summary.critical} {t('inspection.critical')}</Badge>}
                        {insp.summary.poor > 0 && <Badge variant="warning" className="text-[10px]">{insp.summary.poor} {t('inspection.poor')}</Badge>}
                        <Badge variant="secondary" className="text-[10px]">{insp.summary.total} {t('inspection.items')}</Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
