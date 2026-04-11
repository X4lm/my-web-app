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

const UTILITY_TYPES = [
  { value: 'dewa', label: 'DEWA (Electricity & Water)' },
  { value: 'empower', label: 'Empower (District Cooling)' },
  { value: 'gas', label: 'Gas' },
  { value: 'internet', label: 'Internet/Telecom' },
  { value: 'other', label: 'Other' },
]

const UTILITY_LABELS = Object.fromEntries(UTILITY_TYPES.map(u => [u.value, u.label]))

export default function UtilityTracker({ propertyId }) {
  const { currentUser } = useAuth()
  const { formatCurrency } = useLocale()
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
    if (!window.confirm('Delete this utility account?')) return
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
              <Zap className="w-4 h-4" /> Utility Accounts ({accounts.length})
              {totalDeposits > 0 && (
                <Badge variant="secondary" className="text-[10px] ml-2">
                  Deposits: {formatCurrency(totalDeposits)}
                </Badge>
              )}
            </CardTitle>
            <Button onClick={openAdd} size="sm">
              <Plus className="w-4 h-4" /> Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by unit, account #, premise #..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Zap className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium">{accounts.length === 0 ? 'No utility accounts' : 'No matches'}</h3>
              <p className="text-sm text-muted-foreground mt-1">Track DEWA, Empower, and other utility accounts per unit.</p>
              {accounts.length === 0 && (
                <Button onClick={openAdd} size="sm" className="mt-4"><Plus className="w-4 h-4" /> Add Account</Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Account #</TableHead>
                    <TableHead className="hidden sm:table-cell">Premise #</TableHead>
                    <TableHead className="text-right">Deposit</TableHead>
                    <TableHead>Status</TableHead>
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
                          {acc.status === 'active' ? 'Active' : acc.status === 'disconnected' ? 'Disconnected' : 'Closed'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(acc)}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(acc.id)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
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
          <DialogHeader><DialogTitle>{editing ? 'Edit Utility Account' : 'Add Utility Account'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Unit #</Label>
                <Input value={form.unitNumber} onChange={e => setForm(f => ({ ...f, unitNumber: e.target.value }))} placeholder="e.g. 101" />
              </div>
              <div className="space-y-2">
                <Label>Utility Type</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.utilityType} onChange={e => setForm(f => ({ ...f, utilityType: e.target.value }))}>
                  {UTILITY_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Account Number *</Label>
                <Input value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="DEWA account #" />
              </div>
              <div className="space-y-2">
                <Label>Premise Number</Label>
                <Input value={form.premiseNumber} onChange={e => setForm(f => ({ ...f, premiseNumber: e.target.value }))} placeholder="Premise #" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Deposit Amount</Label>
                <Input type="number" value={form.depositAmount} onChange={e => setForm(f => ({ ...f, depositAmount: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="disconnected">Disconnected</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.accountNumber.trim()}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : editing ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
