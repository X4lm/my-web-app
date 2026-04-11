import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
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
  LogOut, Plus, CheckCircle2, Circle, Clock, AlertTriangle,
  Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'

const CHECKLIST_ITEMS = [
  { key: 'notice_received', label: 'Tenant notice received', required: true },
  { key: 'notice_acknowledged', label: 'Notice acknowledged & confirmed', required: true },
  { key: 'final_inspection_scheduled', label: 'Final inspection scheduled', required: false },
  { key: 'final_inspection_done', label: 'Final inspection completed', required: true },
  { key: 'damages_assessed', label: 'Damages assessed & documented', required: false },
  { key: 'outstanding_rent_cleared', label: 'Outstanding rent cleared', required: true },
  { key: 'utilities_final_bill', label: 'DEWA/utilities final bill settled', required: true },
  { key: 'keys_returned', label: 'Keys returned', required: true },
  { key: 'deposit_deductions_calculated', label: 'Security deposit deductions calculated', required: true },
  { key: 'deposit_refunded', label: 'Security deposit refunded', required: true },
  { key: 'ejari_cancelled', label: 'Ejari cancelled', required: true },
  { key: 'unit_cleaned', label: 'Unit cleaned & ready for next tenant', required: false },
]

export default function MoveOutWorkflow({ propertyId }) {
  const { currentUser } = useAuth()
  const { formatDate, formatCurrency } = useLocale()
  const [moveOuts, setMoveOuts] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const colPath = `users/${currentUser.uid}/properties/${propertyId}/moveOuts`

  const [form, setForm] = useState({
    unitNumber: '', tenantName: '', noticeDate: '',
    moveOutDate: '', securityDeposit: '', notes: '',
  })

  useEffect(() => {
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setMoveOuts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [colPath])

  async function handleCreate() {
    if (!form.unitNumber.trim() || !form.tenantName.trim()) return
    setSaving(true)
    try {
      const checklist = {}
      CHECKLIST_ITEMS.forEach(item => { checklist[item.key] = false })
      await addDoc(collection(db, colPath), {
        ...form,
        securityDeposit: Number(form.securityDeposit) || 0,
        checklist,
        deductions: [],
        status: 'in_progress',
        createdAt: serverTimestamp(),
        createdBy: currentUser.displayName || currentUser.email || 'Unknown',
      })
      setDialogOpen(false)
    } catch (err) {
      console.error('[MoveOut] Create error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function toggleCheckItem(moveOutId, key) {
    const mo = moveOuts.find(m => m.id === moveOutId)
    if (!mo) return
    const updated = { ...mo.checklist, [key]: !mo.checklist[key] }
    const allRequired = CHECKLIST_ITEMS.filter(i => i.required).every(i => updated[i.key])
    try {
      await updateDoc(doc(db, colPath, moveOutId), {
        checklist: updated,
        status: allRequired ? 'completed' : 'in_progress',
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('[MoveOut] Update error:', err)
    }
  }

  async function addDeduction(moveOutId, description, amount) {
    const mo = moveOuts.find(m => m.id === moveOutId)
    if (!mo) return
    const deductions = [...(mo.deductions || []), { description, amount: Number(amount), date: new Date().toISOString().slice(0, 10) }]
    const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0)
    const refundAmount = Math.max(0, (mo.securityDeposit || 0) - totalDeductions)
    try {
      await updateDoc(doc(db, colPath, moveOutId), { deductions, totalDeductions, refundAmount, updatedAt: serverTimestamp() })
    } catch (err) {
      console.error('[MoveOut] Deduction error:', err)
    }
  }

  const active = moveOuts.filter(m => m.status === 'in_progress')
  const completed = moveOuts.filter(m => m.status === 'completed')

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Move-Out Workflow
            </CardTitle>
            <Button onClick={() => { setForm({ unitNumber: '', tenantName: '', noticeDate: '', moveOutDate: '', securityDeposit: '', notes: '' }); setDialogOpen(true) }} size="sm">
              <Plus className="w-4 h-4" /> New Move-Out
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : moveOuts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <LogOut className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium">No move-outs in progress</h3>
              <p className="text-sm text-muted-foreground mt-1">Start a move-out workflow when a tenant gives notice.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">In Progress ({active.length})</h3>
                  {active.map(mo => <MoveOutCard key={mo.id} mo={mo} expanded={expanded === mo.id} onToggle={() => setExpanded(expanded === mo.id ? null : mo.id)} onCheck={(key) => toggleCheckItem(mo.id, key)} onDeduct={(desc, amt) => addDeduction(mo.id, desc, amt)} formatDate={formatDate} formatCurrency={formatCurrency} />)}
                </div>
              )}
              {completed.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 mt-4">Completed ({completed.length})</h3>
                  {completed.map(mo => <MoveOutCard key={mo.id} mo={mo} expanded={expanded === mo.id} onToggle={() => setExpanded(expanded === mo.id ? null : mo.id)} onCheck={(key) => toggleCheckItem(mo.id, key)} onDeduct={(desc, amt) => addDeduction(mo.id, desc, amt)} formatDate={formatDate} formatCurrency={formatCurrency} />)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={open => { if (!saving) setDialogOpen(open) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Move-Out</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Unit # *</Label>
                <Input value={form.unitNumber} onChange={e => setForm(f => ({ ...f, unitNumber: e.target.value }))} placeholder="e.g. 101" />
              </div>
              <div className="space-y-2">
                <Label>Tenant Name *</Label>
                <Input value={form.tenantName} onChange={e => setForm(f => ({ ...f, tenantName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Notice Date</Label>
                <Input type="date" value={form.noticeDate} onChange={e => setForm(f => ({ ...f, noticeDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Move-Out Date</Label>
                <Input type="date" value={form.moveOutDate} onChange={e => setForm(f => ({ ...f, moveOutDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Security Deposit Amount</Label>
              <Input type="number" value={form.securityDeposit} onChange={e => setForm(f => ({ ...f, securityDeposit: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reason for move-out, special conditions..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.unitNumber.trim() || !form.tenantName.trim()}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Start Move-Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MoveOutCard({ mo, expanded, onToggle, onCheck, onDeduct, formatDate, formatCurrency }) {
  const [dedDesc, setDedDesc] = useState('')
  const [dedAmt, setDedAmt] = useState('')

  const checklist = mo.checklist || {}
  const completed = CHECKLIST_ITEMS.filter(i => checklist[i.key]).length
  const total = CHECKLIST_ITEMS.length
  const progress = Math.round((completed / total) * 100)

  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <div className="flex items-center gap-3">
          {mo.status === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <Clock className="w-5 h-5 text-amber-600" />
          )}
          <div>
            <p className="text-sm font-medium">Unit {mo.unitNumber} — {mo.tenantName}</p>
            <p className="text-xs text-muted-foreground">
              {mo.moveOutDate ? `Move-out: ${formatDate(mo.moveOutDate)}` : 'No date set'}
              {' · '}{completed}/{total} steps
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-muted-foreground w-8">{progress}%</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t p-3 space-y-4">
          {/* Checklist */}
          <div className="space-y-1">
            {CHECKLIST_ITEMS.map(item => (
              <label key={item.key} className="flex items-center gap-2 py-1 text-sm cursor-pointer hover:bg-muted/30 rounded px-1 -mx-1">
                <input
                  type="checkbox"
                  checked={!!checklist[item.key]}
                  onChange={() => onCheck(item.key)}
                  className="rounded"
                />
                <span className={checklist[item.key] ? 'line-through text-muted-foreground' : ''}>
                  {item.label}
                </span>
                {item.required && <Badge variant="outline" className="text-[9px]">Required</Badge>}
              </label>
            ))}
          </div>

          {/* Deposit reconciliation */}
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium mb-2">Security Deposit Reconciliation</h4>
            <div className="grid grid-cols-3 gap-2 text-sm mb-2">
              <div><span className="text-muted-foreground">Deposit:</span> <span className="font-medium">{formatCurrency(mo.securityDeposit || 0)}</span></div>
              <div><span className="text-muted-foreground">Deductions:</span> <span className="font-medium text-destructive">{formatCurrency(mo.totalDeductions || 0)}</span></div>
              <div><span className="text-muted-foreground">Refund:</span> <span className="font-medium text-emerald-600">{formatCurrency(mo.refundAmount ?? (mo.securityDeposit || 0))}</span></div>
            </div>

            {(mo.deductions || []).length > 0 && (
              <div className="space-y-1 mb-2">
                {mo.deductions.map((d, i) => (
                  <div key={i} className="flex justify-between text-xs text-muted-foreground">
                    <span>{d.description}</span>
                    <span className="text-destructive">-{formatCurrency(d.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Deduction reason"
                value={dedDesc}
                onChange={e => setDedDesc(e.target.value)}
                className="h-8 text-sm flex-1"
              />
              <Input
                type="number"
                placeholder="Amount"
                value={dedAmt}
                onChange={e => setDedAmt(e.target.value)}
                className="h-8 text-sm w-24"
              />
              <Button size="sm" variant="outline" className="h-8"
                disabled={!dedDesc.trim() || !dedAmt}
                onClick={() => { onDeduct(dedDesc, dedAmt); setDedDesc(''); setDedAmt('') }}
              >
                Add
              </Button>
            </div>
          </div>

          {mo.notes && (
            <p className="text-xs text-muted-foreground border-t pt-2">Notes: {mo.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}
