import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/contexts/LocaleContext'

const EMPTY = {
  chequeNumber: '', bankName: '', amount: '', date: '',
  payerName: '', status: 'pending', notes: '',
  paymentType: 'rent',
}

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

export default function ChequeFormDialog({ open, onOpenChange, cheque, onSave, saving }) {
  const { getCurrencyCode } = useLocale()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setForm(cheque ? { ...EMPTY, ...cheque } : { ...EMPTY, date: new Date().toISOString().split('T')[0] })
      setErrors({})
    }
  }, [open, cheque])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }))
  }

  function validate() {
    const e = {}
    if (!form.chequeNumber.trim()) e.chequeNumber = 'Required'
    if (!form.bankName.trim()) e.bankName = 'Required'
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = 'Enter a valid amount'
    if (!form.date) e.date = 'Required'
    if (!form.payerName.trim()) e.payerName = 'Required'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) return setErrors(errs)
    onSave({ ...form, amount: Number(form.amount) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cheque ? 'Edit Cheque' : 'Add Cheque'}</DialogTitle>
          <DialogDescription>Track a post-dated or received cheque.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cheque number</Label>
              <Input
                value={form.chequeNumber}
                onChange={e => set('chequeNumber', e.target.value)}
                placeholder="e.g. 000123"
              />
              {errors.chequeNumber && <p className="text-xs text-destructive">{errors.chequeNumber}</p>}
            </div>
            <div className="space-y-2">
              <Label>Bank name</Label>
              <Input
                value={form.bankName}
                onChange={e => set('bankName', e.target.value)}
                placeholder="e.g. Emirates NBD"
              />
              {errors.bankName && <p className="text-xs text-destructive">{errors.bankName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount ({getCurrencyCode()})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="0.00"
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payer name</Label>
              <Input
                value={form.payerName}
                onChange={e => set('payerName', e.target.value)}
                placeholder="Tenant or company name"
              />
              {errors.payerName && <p className="text-xs text-destructive">{errors.payerName}</p>}
            </div>
            <div className="space-y-2">
              <Label>Payment type</Label>
              <select value={form.paymentType} onChange={e => set('paymentType', e.target.value)} className={SELECT_CLASS}>
                <option value="rent">Rent</option>
                <option value="security_deposit">Security Deposit</option>
                <option value="advance">Advance Payment</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={SELECT_CLASS}>
              <option value="pending">Pending (not yet deposited)</option>
              <option value="deposited">Deposited (awaiting clearance)</option>
              <option value="cleared">Cleared</option>
              <option value="bounced">Bounced</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Optional notes"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : cheque ? 'Save Changes' : 'Add Cheque'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
