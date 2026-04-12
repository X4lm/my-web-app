import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/contexts/LocaleContext'
import { validateAmount } from '@/utils/validation'

const EMPTY = {
  chequeNumber: '', bankName: '', amount: '', date: '',
  payerName: '', status: 'pending', notes: '',
  paymentType: 'rent',
}

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

export default function ChequeFormDialog({ open, onOpenChange, cheque, onSave, saving }) {
  const { t, getCurrencyCode } = useLocale()
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
    if (!form.chequeNumber.trim()) e.chequeNumber = t('common.required')
    if (!form.bankName.trim()) e.bankName = t('common.required')
    const amtErr = validateAmount(form.amount)
    if (amtErr) e.amount = amtErr
    if (!form.date) e.date = t('common.required')
    if (!form.payerName.trim()) e.payerName = t('common.required')
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
          <DialogTitle>{cheque ? t('chequeForm.editCheque') : t('chequeForm.addCheque')}</DialogTitle>
          <DialogDescription>{t('chequeForm.desc')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('chequeForm.chequeNumber')}</Label>
              <Input
                value={form.chequeNumber}
                onChange={e => set('chequeNumber', e.target.value)}
                maxLength={50}
                placeholder={t('chequeForm.chequePlaceholder')}
              />
              {errors.chequeNumber && <p className="text-xs text-destructive">{errors.chequeNumber}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('chequeForm.bank')}</Label>
              <Input
                value={form.bankName}
                onChange={e => set('bankName', e.target.value)}
                maxLength={100}
                placeholder={t('chequeForm.bankPlaceholder')}
              />
              {errors.bankName && <p className="text-xs text-destructive">{errors.bankName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('chequeForm.amount')} ({getCurrencyCode()})</Label>
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
              <Label>{t('chequeForm.dueDate')}</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('chequeForm.payer')}</Label>
              <Input
                value={form.payerName}
                onChange={e => set('payerName', e.target.value)}
                maxLength={200}
                placeholder={t('chequeForm.payerPlaceholder')}
              />
              {errors.payerName && <p className="text-xs text-destructive">{errors.payerName}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('chequeForm.paymentType')}</Label>
              <select value={form.paymentType} onChange={e => set('paymentType', e.target.value)} className={SELECT_CLASS}>
                <option value="rent">{t('chequeForm.typeRent')}</option>
                <option value="security_deposit">{t('chequeForm.typeSecurityDeposit')}</option>
                <option value="advance">{t('chequeForm.typeAdvance')}</option>
                <option value="other">{t('chequeForm.typeOther')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('chequeForm.status')}</Label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={SELECT_CLASS}>
              <option value="pending">{t('chequeForm.statusPendingDesc')}</option>
              <option value="deposited">{t('chequeForm.statusDepositedDesc')}</option>
              <option value="cleared">{t('chequeForm.statusCleared')}</option>
              <option value="bounced">{t('chequeForm.statusBounced')}</option>
              <option value="cancelled">{t('chequeForm.statusCancelled')}</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>{t('chequeForm.notes')}</Label>
            <Input
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder={t('chequeForm.notesPlaceholder')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('common.saving') : cheque ? t('common.saveChanges') : t('chequeForm.addCheque')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
