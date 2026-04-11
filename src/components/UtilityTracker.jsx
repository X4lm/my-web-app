import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Zap, Plus, MoreHorizontal, Pencil, Trash2, Loader2, Search,
} from 'lucide-react'

const UTILITY_TYPE_KEYS = [
  { value: 'dewa', tKey: 'utilities.typeDewa' },
  { value: 'empower', tKey: 'utilities.typeEmpower' },
  { value: 'gas', tKey: 'utilities.typeGas' },
  { value: 'internet', tKey: 'utilities.typeInternet' },
  { value: 'other', tKey: 'utilities.typeOther' },
]

export default function UtilityTracker({ propertyId }) {
  const { currentUser } = useAuth()
  const { t, formatCurrency } = useLocale()

  const UTILITY_TYPES = UTILITY_TYPE_KEYS.map(u => ({ value: u.value, label: t(u.tKey) }))
  const UTILITY_LABELS = Object.fromEntries(UTILITY_TYPES.map(u => [u.value, u.label]))
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const colPath = `users/${currentUser.uid}/properties/${propertyId}/utilities`

  const [form, setForm] = useState({
    unitNumber: '', utilityType: 'dewa', accountNumber: '',
    premiseNumber: '', depositAmount: '', status: 'active', notes: '',
  })

  useEffect(() => {
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [colPath])

  function openAdd() {
    setEditing(null)
    setForm({ unitNumber: '', utilityType: 'dewa', accountNumber: '', premiseNumber: '', depositAmount: '', status: 'active', notes: '' })
    setDialogOpen(true)
  }

  function openEdit(acc) {
    setEditing(acc)
    setForm({
      unitNumber: acc.unitNumber || '',
      utilityType: acc.utilityType || 'dewa',
      accountNumber: acc.accountNumber || '',
      premiseNumber: acc.premiseNumber || '',
      depositAmount: String(acc.depositAmount || ''),
      status: acc.status || 'active',
      notes: acc.notes || '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.accountNumber.trim()) return
    setSaving(true)
    try {
      const data = { ...form, depositAmount: Number(form.depositAmount) || 0 }
      if (editing) {
        await updateDoc(doc(db, colPath, editing.id), { ...data, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, colPath), { ...data, createdAt: serverTimestamp() })
      }
      setDialogOpen(false)
      setEditing(null)
    } catch (err) {
      console.error('[Utilities] Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(`${t('common.delete')}?`)) return
    try {
      await deleteDoc(doc(db, colPath, id))
    } catch (err) {
      console.error('[Utilities] Delete error:', err)
    }
  }

  const filtered = accounts.filter(a => {
    if (!search) return true
    const s = search.toLowerCase()
    return (a.unitNumber || '').toLowerCase().includes(s) ||
      (a.accountNumber || '').toLowerCase().includes(s) ||
      (a.premiseNumber || '').toLowerCase().includes(s)
  })

  const totalDeposits = accounts.reduce((s, a) => s + Number(a.depositAmount || 0), 0)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4" /> {t('utilities.title')} ({accounts.length})
              {totalDeposits > 0 && (
                <Badge variant="secondary" className="text-[10px] ml-2">
                  {t('utilities.deposits')}: {formatCurrency(totalDeposits)}
                </Badge>
              )}
            </CardTitle>
            <Button onClick={openAdd} size="sm">
              <Plus className="w-4 h-4" /> {t('utilities.addAccount')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('utilities.search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Zap className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium">{accounts.length === 0 ? t('utilities.noAccounts') : t('utilities.noMatches')}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t('utilities.trackDesc')}</p>
              {accounts.length === 0 && (
                <Button onClick={openAdd} size="sm" className="mt-4"><Plus className="w-4 h-4" /> {t('utilities.addAccount')}</Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.unit')}</TableHead>
                    <TableHead>{t('common.type')}</TableHead>
                    <TableHead>{t('utilities.accountNumber')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('utilities.premiseNumber')}</TableHead>
                    <TableHead className="text-right">{t('utilities.deposits')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(acc => (
                    <TableRow key={acc.id}>
                      <TableCell className="text-sm font-medium">{acc.unitNumber || '—'}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{UTILITY_LABELS[acc.utilityType] || acc.utilityType}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{acc.accountNumber}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{acc.premiseNumber || '—'}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(acc.depositAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={acc.status === 'active' ? 'default' : acc.status === 'disconnected' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {acc.status === 'active' ? t('utilities.statusActive') : acc.status === 'disconnected' ? t('utilities.statusDisconnected') : t('utilities.statusClosed')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(acc)}><Pencil className="mr-2 h-3.5 w-3.5" /> {t('common.edit')}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(acc.id)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> {t('common.delete')}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={open => { if (!saving) setDialogOpen(open) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? t('utilities.editAccount') : t('utilities.addAccountTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('utilities.unitNumber')}</Label>
                <Input value={form.unitNumber} onChange={e => setForm(f => ({ ...f, unitNumber: e.target.value }))} placeholder="e.g. 101" />
              </div>
              <div className="space-y-2">
                <Label>{t('utilities.utilityType')}</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.utilityType} onChange={e => setForm(f => ({ ...f, utilityType: e.target.value }))}>
                  {UTILITY_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('utilities.accountNumber')} *</Label>
                <Input value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('utilities.premiseNumber')}</Label>
                <Input value={form.premiseNumber} onChange={e => setForm(f => ({ ...f, premiseNumber: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('utilities.depositAmount')}</Label>
                <Input type="number" value={form.depositAmount} onChange={e => setForm(f => ({ ...f, depositAmount: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>{t('utilities.status')}</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">{t('utilities.statusActive')}</option>
                  <option value="disconnected">{t('utilities.statusDisconnected')}</option>
                  <option value="closed">{t('utilities.statusClosed')}</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('common.notes')}</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !form.accountNumber.trim()}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.saving')}</> : editing ? t('common.update') : t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
