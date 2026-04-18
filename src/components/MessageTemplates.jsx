import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  FileText, Plus, MoreHorizontal, Pencil, Trash2, Copy, Check, Loader2,
} from 'lucide-react'

const CATEGORY_KEYS = [
  'rent_reminder', 'lease_renewal', 'maintenance_notice',
  'move_in', 'move_out', 'general', 'complaint', 'welcome',
]

const CATEGORY_I18N = {
  rent_reminder: 'templates.catRentCollection',
  lease_renewal: 'templates.catLeaseManagement',
  maintenance_notice: 'templates.catMaintenance',
  move_in: 'templates.catWelcome',
  move_out: 'templates.catNotice',
  general: 'templates.catGeneral',
  complaint: 'templates.catFeedback',
  welcome: 'templates.catWelcome',
}

const DEFAULT_TEMPLATES = [
  {
    name: 'Rent Due Reminder',
    category: 'rent_reminder',
    subject: 'Rent Payment Reminder - {{unit}}',
    body: 'Dear {{tenant_name}},\n\nThis is a friendly reminder that your rent payment of {{rent_amount}} for unit {{unit}} is due on {{due_date}}.\n\nPlease ensure payment is made on time to avoid any late fees.\n\nThank you,\n{{manager_name}}',
  },
  {
    name: 'Lease Renewal Notice',
    category: 'lease_renewal',
    subject: 'Lease Renewal - {{unit}}',
    body: 'Dear {{tenant_name}},\n\nYour lease for unit {{unit}} is set to expire on {{lease_end}}. We would like to offer you a renewal.\n\nPlease contact us at your earliest convenience to discuss the terms of your new lease.\n\nBest regards,\n{{manager_name}}',
  },
  {
    name: 'Maintenance Scheduled',
    category: 'maintenance_notice',
    subject: 'Scheduled Maintenance - {{property_name}}',
    body: 'Dear Residents,\n\nPlease be informed that maintenance work will be carried out on {{date}} between {{time_start}} and {{time_end}}.\n\nWork details: {{description}}\n\nWe apologize for any inconvenience.\n\nBuilding Management',
  },
  {
    name: 'Welcome New Tenant',
    category: 'welcome',
    subject: 'Welcome to {{property_name}}',
    body: 'Dear {{tenant_name}},\n\nWelcome to {{property_name}}! We are pleased to have you as our tenant in unit {{unit}}.\n\nHere are some important contacts:\n- Building Management: {{manager_phone}}\n- Emergency: {{emergency_number}}\n\nPlease don\'t hesitate to reach out if you need anything.\n\nBest regards,\n{{manager_name}}',
  },
]

export default function MessageTemplates() {
  const { currentUser } = useAuth()
  const { t } = useLocale()
  const confirm = useConfirm()
  const toast = useToast()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [filterCategory, setFilterCategory] = useState('all')

  const colPath = `users/${currentUser.uid}/messageTemplates`

  const [form, setForm] = useState({
    name: '', category: 'general', subject: '', body: '',
  })

  useEffect(() => {
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (err) => {
      logError('[Firestore] Templates listen error:', err)
      setLoading(false)
    })
    return unsub
  }, [colPath])

  function openAdd() {
    setEditing(null)
    setForm({ name: '', category: 'general', subject: '', body: '' })
    setDialogOpen(true)
  }

  function openEdit(tmpl) {
    setEditing(tmpl)
    setForm({
      name: tmpl.name || '',
      category: tmpl.category || 'general',
      subject: tmpl.subject || '',
      body: tmpl.body || '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.body.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await updateDoc(doc(db, colPath, editing.id), { ...form, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, colPath), { ...form, createdAt: serverTimestamp() })
      }
      setDialogOpen(false)
      setEditing(null)
    } catch (err) {
      logError('[Firestore] Template save error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    const ok = await confirm({
      title: t('templates.deleteTitle'),
      description: t('templates.deleteConfirm'),
      confirmLabel: t('common.delete'),
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteDoc(doc(db, colPath, id))
    } catch (err) {
      logError('[Firestore] Template delete error:', err)
      toast.error(t('common.deleteFailed'))
    }
  }

  async function loadDefaults() {
    const ok = await confirm({
      title: t('templates.loadDefaultsTitle'),
      description: t('templates.loadDefaultsDesc'),
      confirmLabel: t('common.add'),
    })
    if (!ok) return
    try {
      for (const tmpl of DEFAULT_TEMPLATES) {
        await addDoc(collection(db, colPath), { ...tmpl, createdAt: serverTimestamp() })
      }
    } catch (err) {
      logError('[Firestore] Load defaults error:', err)
      toast.error(t('common.error'))
    }
  }

  function copyToClipboard(tmpl) {
    const text = `Subject: ${tmpl.subject}\n\n${tmpl.body}`
    navigator.clipboard.writeText(text)
    setCopiedId(tmpl.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filtered = filterCategory === 'all'
    ? templates
    : templates.filter(tmpl => tmpl.category === filterCategory)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" /> {t('templates.title')}
            </CardTitle>
            <div className="flex gap-2">
              {templates.length === 0 && (
                <Button variant="outline" size="sm" onClick={loadDefaults}>
                  {t('templates.loadDefaults')}
                </Button>
              )}
              <Button onClick={openAdd} size="sm">
                <Plus className="w-4 h-4" /> {t('templates.newTemplate')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Category filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            <Button
              variant={filterCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCategory('all')}
            >
              {t('templates.allCategories')}
            </Button>
            {CATEGORY_KEYS.map(catValue => (
              <Button
                key={catValue}
                variant={filterCategory === catValue ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCategory(catValue)}
                className="whitespace-nowrap"
              >
                {t(CATEGORY_I18N[catValue] || 'templates.catGeneral')}
              </Button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium">
                {templates.length === 0 ? t('templates.noTemplates') : t('templates.noTemplatesInCategory')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {templates.length === 0
                  ? t('templates.getStarted')
                  : t('templates.tryAdjust')}
              </p>
              {templates.length === 0 && (
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={loadDefaults}>{t('templates.loadDefaults')}</Button>
                  <Button onClick={openAdd} size="sm"><Plus className="w-4 h-4" /> {t('templates.newTemplate')}</Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map(tmpl => (
                <div key={tmpl.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium">{tmpl.name}</h4>
                      <Badge variant="secondary" className="text-[10px] mt-1">
                        {CATEGORY_I18N[tmpl.category] ? t(CATEGORY_I18N[tmpl.category]) : tmpl.category}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => copyToClipboard(tmpl)}>
                          {copiedId === tmpl.id ? (
                            <><Check className="mr-2 h-3.5 w-3.5" /> {t('common.saved')}</>
                          ) : (
                            <><Copy className="mr-2 h-3.5 w-3.5" /> {t('common.export')}</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(tmpl)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" /> {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(tmpl.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {tmpl.subject && (
                    <p className="text-xs text-muted-foreground">
                      {t('common.subject')}: {tmpl.subject}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
                    {tmpl.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!saving) setDialogOpen(open) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('templates.editTemplate') : t('templates.newTemplate')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('templates.templateName')} *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={t('templates.namePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('common.category')}</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORY_KEYS.map(catValue => (
                    <option key={catValue} value={catValue}>{t(CATEGORY_I18N[catValue] || 'templates.catGeneral')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('templates.subjectLine')}</Label>
              <Input
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder={t('templates.subjectPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('templates.messageBody')} *</Label>
              <textarea
                className="flex min-h-[160px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder={t('templates.messagePlaceholder')}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {t('templates.placeholderHelp')}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.body.trim()}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.saving')}</> : editing ? t('common.update') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
