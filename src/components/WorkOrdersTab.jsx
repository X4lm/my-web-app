import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Pencil, Trash2, ClipboardList, AlertCircle } from 'lucide-react'

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

const PRIORITY = {
  low: { tKey: 'workOrders.priorityLow', variant: 'secondary' },
  medium: { tKey: 'workOrders.priorityMedium', variant: 'warning' },
  high: { tKey: 'workOrders.priorityHigh', variant: 'destructive' },
  urgent: { tKey: 'workOrders.priorityUrgent', variant: 'destructive' },
}

const STATUS = {
  open: { tKey: 'workOrders.statusOpen', variant: 'warning' },
  in_progress: { tKey: 'workOrders.statusInProgress', variant: 'default' },
  on_hold: { tKey: 'workOrders.statusOnHold', variant: 'secondary' },
  completed: { tKey: 'workOrders.statusCompleted', variant: 'success' },
  cancelled: { tKey: 'workOrders.statusCancelled', variant: 'secondary' },
}

const CATEGORIES = {
  plumbing: 'Plumbing', electrical: 'Electrical', hvac: 'HVAC',
  cleaning: 'Cleaning', painting: 'Painting', carpentry: 'Carpentry',
  pest_control: 'Pest Control', general: 'General', other: 'Other',
}

const EMPTY = {
  title: '', description: '', category: 'general', priority: 'medium',
  status: 'open', unitNumber: '', assignedVendor: '', estimatedCost: '',
  reportedBy: '', dueDate: '',
}

export default function WorkOrdersTab({ propertyId, ownerUid }) {
  const { currentUser } = useAuth()
  const { t, formatCurrency, formatDate } = useLocale()
  const uid = ownerUid || currentUser.uid
  const [orders, setOrders] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  const colPath = `users/${uid}/properties/${propertyId}/workOrders`

  useEffect(() => {
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [colPath])

  // Load vendors for assignment dropdown
  useEffect(() => {
    const q = query(collection(db, `users/${uid}/vendors`), orderBy('name'))
    const unsub = onSnapshot(q, (snap) => {
      setVendors(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [uid])

  const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter)
  const openCount = orders.filter(o => o.status === 'open').length
  const urgentCount = orders.filter(o => o.priority === 'urgent' && o.status !== 'completed' && o.status !== 'cancelled').length

  function openAdd() {
    setEditing(null)
    setForm({ ...EMPTY, reportedBy: currentUser.displayName || currentUser.email || '' })
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(o) {
    setEditing(o)
    setForm({ ...EMPTY, ...o })
    setErrors({})
    setDialogOpen(true)
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }))
  }

  async function handleSave(e) {
    e.preventDefault()
    const errs = {}
    if (!form.title.trim()) errs.title = 'Required'
    if (Object.keys(errs).length) return setErrors(errs)

    setSaving(true)
    try {
      const data = {
        ...form,
        estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : '',
        assignedVendorUid: form.assignedVendorUid || null,
      }
      if (editing) {
        await updateDoc(doc(db, colPath, editing.id), { ...data, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, colPath), { ...data, createdAt: serverTimestamp() })
      }
      setDialogOpen(false)
      setEditing(null)
    } catch (err) {
      logError('[WorkOrders] Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(t('workOrders.deleteConfirm'))) return
    try {
      await deleteDoc(doc(db, colPath, id))
    } catch (err) {
      logError('[WorkOrders] Delete error:', err)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-12 text-center">{t('workOrders.loading')}</p>
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {orders.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          {openCount > 0 && (
            <Badge variant="warning" className="text-xs">{openCount} {t('workOrders.open')}</Badge>
          )}
          {urgentCount > 0 && (
            <Badge variant="destructive" className="text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {urgentCount} {t('workOrders.urgent')}
            </Badge>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> {t('workOrders.title')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">{t('common.allStatus')}</option>
                {Object.entries(STATUS).map(([val, { tKey }]) => (
                  <option key={val} value={val}>{t(tKey)}</option>
                ))}
              </select>
              <Button onClick={openAdd} size="sm">
                <Plus className="w-4 h-4" /> {t('workOrders.newOrder')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium">{t('workOrders.noOrders')}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t('workOrders.createDesc')}</p>
              <Button onClick={openAdd} size="sm" className="mt-4">
                <Plus className="w-4 h-4" /> {t('workOrders.newOrder')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('workOrders.titleLabel')}</TableHead>
                    <TableHead>{t('common.category')}</TableHead>
                    <TableHead>{t('common.priority')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('workOrders.assignedVendor')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('workOrders.dueDate')}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(o => {
                    const pri = PRIORITY[o.priority] || PRIORITY.medium
                    const st = STATUS[o.status] || STATUS.open
                    const isOverdue = o.dueDate && o.status !== 'completed' && o.status !== 'cancelled' && new Date(o.dueDate) < new Date()
                    return (
                      <TableRow key={o.id} className={isOverdue ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{o.title}</p>
                            {o.unitNumber && <p className="text-xs text-muted-foreground">{t('common.unit')} {o.unitNumber}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {CATEGORIES[o.category] || o.category}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge variant={pri.variant}>{t(pri.tKey)}</Badge></TableCell>
                        <TableCell><Badge variant={st.variant}>{t(st.tKey)}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {o.assignedVendor || '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {o.dueDate ? (
                            <span className={isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                              {formatDate(o.dueDate)}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(o)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" /> {t('common.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(o.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> {t('common.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!saving) setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('workOrders.editOrder') : t('workOrders.newOrderTitle')}</DialogTitle>
            <DialogDescription>{t('workOrders.orderDesc')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>{t('workOrders.titleLabel')}</Label>
              <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder={t('workOrders.titlePlaceholder')} maxLength={200} />
              {errors.title && <p className="text-xs text-destructive">{t('common.required')}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('workOrders.descriptionLabel')}</Label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                maxLength={2000}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                placeholder={t('workOrders.descriptionPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('common.category')}</Label>
                <select value={form.category} onChange={e => set('category', e.target.value)} className={SELECT_CLASS}>
                  {Object.entries(CATEGORIES).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('common.priority')}</Label>
                <select value={form.priority} onChange={e => set('priority', e.target.value)} className={SELECT_CLASS}>
                  {Object.entries(PRIORITY).map(([val, { tKey }]) => (
                    <option key={val} value={val}>{t(tKey)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('common.status')}</Label>
                <select value={form.status} onChange={e => set('status', e.target.value)} className={SELECT_CLASS}>
                  {Object.entries(STATUS).map(([val, { tKey }]) => (
                    <option key={val} value={val}>{t(tKey)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('workOrders.unitNumber')}</Label>
                <Input value={form.unitNumber} onChange={e => set('unitNumber', e.target.value)} placeholder={`${t('workOrders.unitNumber')} (${t('common.optional')})`} maxLength={20} />
              </div>
              <div className="space-y-2">
                <Label>{t('workOrders.assignedVendor')}</Label>
                <select value={form.assignedVendor} onChange={e => set('assignedVendor', e.target.value)} className={SELECT_CLASS}>
                  <option value="">{t('workOrders.unassigned')}</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.name}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('workOrders.dueDate')}</Label>
                <Input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('workOrders.estimatedCost')}</Label>
                <Input type="number" min="0" value={form.estimatedCost} onChange={e => set('estimatedCost', e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('workOrders.reportedBy')}</Label>
              <Input value={form.reportedBy} onChange={e => set('reportedBy', e.target.value)} placeholder={t('workOrders.reportedByPlaceholder')} maxLength={200} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>
                {saving ? t('common.saving') : editing ? t('common.saveChanges') : t('workOrders.newOrder')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
