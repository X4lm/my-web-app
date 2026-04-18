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
  Megaphone, Plus, MoreHorizontal, Pencil, Trash2, Pin, Loader2, AlertTriangle, Info, Bell,
} from 'lucide-react'

const PRIORITY_OPTIONS = [
  { value: 'info', tKey: 'announce.priorityInfo', icon: Info, color: 'text-blue-600', variant: 'secondary' },
  { value: 'notice', tKey: 'announce.priorityNotice', icon: Bell, color: 'text-amber-600', variant: 'warning' },
  { value: 'urgent', tKey: 'announce.priorityUrgent', icon: AlertTriangle, color: 'text-destructive', variant: 'destructive' },
]

const PRIORITY_MAP = Object.fromEntries(PRIORITY_OPTIONS.map(p => [p.value, p]))

export default function AnnouncementsTab({ propertyId, ownerUid }) {
  const { currentUser } = useAuth()
  const { t, formatDateTime } = useLocale()
  const confirm = useConfirm()
  const toast = useToast()
  const uid = ownerUid || currentUser.uid
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const colPath = `users/${uid}/properties/${propertyId}/announcements`

  const [form, setForm] = useState({
    title: '', body: '', priority: 'info', pinned: false,
  })

  useEffect(() => {
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Sort: pinned first, then by date
      items.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return 0 // already ordered by createdAt desc from query
      })
      setAnnouncements(items)
      setLoading(false)
    }, (err) => {
      logError('[Firestore] Announcements listen error:', err)
      setLoading(false)
    })
    return unsub
  }, [colPath])

  function openAdd() {
    setEditing(null)
    setForm({ title: '', body: '', priority: 'info', pinned: false })
    setDialogOpen(true)
  }

  function openEdit(ann) {
    setEditing(ann)
    setForm({
      title: ann.title || '',
      body: ann.body || '',
      priority: ann.priority || 'info',
      pinned: ann.pinned || false,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.body.trim()) return
    setSaving(true)
    try {
      const authorName = currentUser.displayName || currentUser.email || 'Unknown'
      const data = { ...form, author: authorName }
      if (editing) {
        await updateDoc(doc(db, colPath, editing.id), { ...data, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, colPath), { ...data, createdAt: serverTimestamp() })
      }
      setDialogOpen(false)
      setEditing(null)
    } catch (err) {
      logError('[Firestore] Announcement save error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    const ok = await confirm({
      description: t('announce.deleteConfirm'),
      confirmLabel: t('common.delete'),
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteDoc(doc(db, colPath, id))
    } catch (err) {
      logError('[Firestore] Announcement delete error:', err)
      toast.error(t('common.deleteFailed'))
    }
  }

  async function togglePin(ann) {
    try {
      await updateDoc(doc(db, colPath, ann.id), { pinned: !ann.pinned })
    } catch (err) {
      logError('[Firestore] Toggle pin error:', err)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="w-4 h-4" /> {t('announce.title')}
            </CardTitle>
            <Button onClick={openAdd} size="sm">
              <Plus className="w-4 h-4" /> {t('announce.newAnnouncement')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t('common.loading')}</p>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Megaphone className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium">{t('announce.noAnnouncements')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('announce.postDesc')}
              </p>
              <Button onClick={openAdd} size="sm" className="mt-4">
                <Plus className="w-4 h-4" /> {t('announce.newAnnouncement')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map(ann => {
                const pri = PRIORITY_MAP[ann.priority] || PRIORITY_MAP.info
                const PriIcon = pri.icon
                return (
                  <div
                    key={ann.id}
                    className={`border rounded-lg p-4 ${ann.pinned ? 'bg-muted/50 border-primary/30' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <PriIcon className={`w-4 h-4 mt-0.5 shrink-0 ${pri.color}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-medium">{ann.title}</h4>
                            <Badge variant={pri.variant} className="text-[10px]">{t(pri.tKey)}</Badge>
                            {ann.pinned && (
                              <Badge variant="outline" className="text-[10px]">
                                <Pin className="w-2.5 h-2.5 mr-0.5" /> {t('announce.pinned')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                            {ann.body}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {t('announce.postedBy')} {ann.author} · {formatDateTime(ann.createdAt)}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => togglePin(ann)}>
                            <Pin className="mr-2 h-3.5 w-3.5" />
                            {ann.pinned ? t('announce.unpin') : t('announce.pinToTop')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(ann)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(ann.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!saving) setDialogOpen(open) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t('announce.editAnnouncement') : t('announce.newAnnouncement')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('announce.titleLabel')} *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                maxLength={200}
                placeholder={t('announce.titlePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('announce.priority')}</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p.value} value={p.value}>{t(p.tKey)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('announce.messageLabel')} *</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                maxLength={5000}
                placeholder={t('announce.messagePlaceholder')}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
                className="rounded border-input"
              />
              {t('announce.pinCheckbox')}
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.body.trim()}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.saving')}</> : editing ? t('common.update') : t('announce.post')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
