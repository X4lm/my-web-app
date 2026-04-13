import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  LogOut, Plus, CheckCircle2, Circle, Clock, AlertTriangle,
  Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'

const CHECKLIST_ITEM_KEYS = [
  { key: 'notice_received', tKey: 'moveOut.noticeReceived', required: true },
  { key: 'notice_acknowledged', tKey: 'moveOut.noticeAcknowledged', required: true },
  { key: 'final_inspection_scheduled', tKey: 'moveOut.finalInspectionScheduled', required: false },
  { key: 'final_inspection_done', tKey: 'moveOut.finalInspectionDone', required: true },
  { key: 'damages_assessed', tKey: 'moveOut.damagesAssessed', required: false },
  { key: 'outstanding_rent_cleared', tKey: 'moveOut.outstandingRentCleared', required: true },
  { key: 'utilities_final_bill', tKey: 'moveOut.utilitiesFinalBill', required: true },
  { key: 'keys_returned', tKey: 'moveOut.keysReturned', required: true },
  { key: 'deposit_deductions_calculated', tKey: 'moveOut.depositDeductionsCalculated', required: true },
  { key: 'deposit_refunded', tKey: 'moveOut.depositRefunded', required: true },
  { key: 'ejari_cancelled', tKey: 'moveOut.ejariCancelled', required: true },
  { key: 'unit_cleaned', tKey: 'moveOut.unitCleaned', required: false },
]

export default function MoveOutWorkflow({ propertyId, ownerUid }) {
  const { currentUser } = useAuth()
  const { t, formatDate, formatCurrency } = useLocale()
  const uid = ownerUid || currentUser.uid

  const CHECKLIST_ITEMS = CHECKLIST_ITEM_KEYS.map(c => ({ ...c, label: t(c.tKey) }))
  const [moveOuts, setMoveOuts] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const colPath = `users/${uid}/properties/${propertyId}/moveOuts`

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
      logError('[MoveOut] Create error:', err)
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
      logError('[MoveOut] Update error:', err)
    }
  }

  async function addDeduction(moveOutId, description, amount) {
    const mo = moveOuts.find(m => m.id === moveOutId)
    if (!mo) return
    const amt = Number(amount)
    if (isNaN(amt) || amt <= 0 || amt > 99999999.99) {
      alert('Invalid deduction amount')
      return
    }
    const existingDeductions = mo.deductions || []
    const existingTotal = existingDeductions.reduce((s, d) => s + d.amount, 0)
    if (existingTotal + amt > (mo.securityDeposit || 0)) {
      if (!confirm('Total deductions exceed security deposit. Continue?')) return
    }
    const deductions = [...existingDeductions, { description, amount: amt, date: new Date().toISOString().slice(0, 10) }]
    const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0)
    const refundAmount = Math.max(0, (mo.securityDeposit || 0) - totalDeductions)
    try {
      await updateDoc(doc(db, colPath, moveOutId), { deductions, totalDeductions, refundAmount, updatedAt: serverTimestamp() })
    } catch (err) {
      logError('[MoveOut] Deduction error:', err)
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
              <LogOut className="w-4 h-4" /> {t('moveOut.title')}
            </CardTitle>
            <Button onClick={() => { setForm({ unitNumber: '', tenantName: '', noticeDate: '', moveOutDate: '', securityDeposit: '', notes: '' }); setDialogOpen(true) }} size="sm">
              <Plus className="w-4 h-4" /> {t('moveOut.newMoveOut')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t('common.loading')}</p>
          ) : moveOuts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <LogOut className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium">{t('moveOut.noMoveOuts')}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t('moveOut.startDesc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t('moveOut.inProgress')} ({active.length})</h3>
                  {active.map(mo => <MoveOutCard key={mo.id} mo={mo} expanded={expanded === mo.id} onToggle={() => setExpanded(expanded === mo.id ? null : mo.id)} onCheck={(key) => toggleCheckItem(mo.id, key)} onDeduct={(desc, amt) => addDeduction(mo.id, desc, amt)} formatDate={formatDate} formatCurrency={formatCurrency} t={t} checklistItems={CHECKLIST_ITEMS} />)}
                </div>
              )}
              {completed.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 mt-4">{t('moveOut.completed')} ({completed.length})</h3>
                  {completed.map(mo => <MoveOutCard key={mo.id} mo={mo} expanded={expanded === mo.id} onToggle={() => setExpanded(expanded === mo.id ? null : mo.id)} onCheck={(key) => toggleCheckItem(mo.id, key)} onDeduct={(desc, amt) => addDeduction(mo.id, desc, amt)} formatDate={formatDate} formatCurrency={formatCurrency} t={t} checklistItems={CHECKLIST_ITEMS} />)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={open => { if (!saving) setDialogOpen(open) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('moveOut.newMoveOut')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('moveOut.unitNumber')} *</Label>
                <Input value={form.unitNumber} onChange={e => setForm(f => ({ ...f, unitNumber: e.target.value }))} placeholder="e.g. 101" />
              </div>
              <div className="space-y-2">
                <Label>{t('moveOut.tenantName')} *</Label>
                <Input value={form.tenantName} onChange={e => setForm(f => ({ ...f, tenantName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('common.date')}</Label>
                <Input type="date" value={form.noticeDate} onChange={e => setForm(f => ({ ...f, noticeDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('moveOut.moveOutDate')}</Label>
                <Input type="date" value={form.moveOutDate} onChange={e => setForm(f => ({ ...f, moveOutDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('moveOut.depositAmount')}</Label>
              <Input type="number" value={form.securityDeposit} onChange={e => setForm(f => ({ ...f, securityDeposit: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>{t('common.notes')}</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} disabled={saving || !form.unitNumber.trim() || !form.tenantName.trim()}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.saving')}</> : t('moveOut.startMoveOut')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MoveOutCard({ mo, expanded, onToggle, onCheck, onDeduct, formatDate, formatCurrency, t, checklistItems: CHECKLIST_ITEMS }) {
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
            <p className="text-sm font-medium">{t('common.unit')} {mo.unitNumber} — {mo.tenantName}</p>
            <p className="text-xs text-muted-foreground">
              {mo.moveOutDate ? `${t('moveOut.moveOutDate')}: ${formatDate(mo.moveOutDate)}` : ''}
              {' · '}{completed}/{total} {t('moveOut.steps')}
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
                {item.required && <Badge variant="outline" className="text-[9px]">{t('common.required')}</Badge>}
              </label>
            ))}
          </div>

          {/* Deposit reconciliation */}
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium mb-2">{t('moveOut.depositReconciliation')}</h4>
            <div className="grid grid-cols-3 gap-2 text-sm mb-2">
              <div><span className="text-muted-foreground">{t('moveOut.deposit')}:</span> <span className="font-medium">{formatCurrency(mo.securityDeposit || 0)}</span></div>
              <div><span className="text-muted-foreground">{t('moveOut.deductions')}:</span> <span className="font-medium text-destructive">{formatCurrency(mo.totalDeductions || 0)}</span></div>
              <div><span className="text-muted-foreground">{t('moveOut.refund')}:</span> <span className="font-medium text-emerald-600">{formatCurrency(mo.refundAmount ?? (mo.securityDeposit || 0))}</span></div>
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
                placeholder={t('moveOut.deductions')}
                value={dedDesc}
                onChange={e => setDedDesc(e.target.value)}
                className="h-8 text-sm flex-1"
              />
              <Input
                type="number"
                placeholder={t('common.amount')}
                value={dedAmt}
                onChange={e => setDedAmt(e.target.value)}
                className="h-8 text-sm w-24"
              />
              <Button size="sm" variant="outline" className="h-8"
                disabled={!dedDesc.trim() || !dedAmt}
                onClick={() => { onDeduct(dedDesc, dedAmt); setDedDesc(''); setDedAmt('') }}
              >
                {t('moveOut.addDeduction')}
              </Button>
            </div>
          </div>

          {mo.notes && (
            <p className="text-xs text-muted-foreground border-t pt-2">{t('common.notes')}: {mo.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}
