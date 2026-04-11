import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/contexts/LocaleContext'

const EMPTY = { date: '', category: 'maintenance', cost: '', vendor: '', description: '' }

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

export default function ExpenseFormDialog({ open, onOpenChange, expense, onSave, saving }) {
  const { t, getCurrencyCode } = useLocale()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setForm(expense ? { ...EMPTY, ...expense } : { ...EMPTY, date: new Date().toISOString().split('T')[0] })
      setErrors({})
    }
  }, [open, expense])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }))
  }

  function validate() {
    const e = {}
    if (!form.date) e.date = t('common.required')
    if (!form.cost || isNaN(form.cost) || Number(form.cost) <= 0) e.cost = t('common.validAmount')
    if (!form.description.trim()) e.description = t('common.required')
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) return setErrors(errs)
    onSave({ ...form, cost: Number(form.cost) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? t('expenseForm.editExpense') : t('expenseForm.addExpense')}</DialogTitle>
          <DialogDescription>{t('expenseForm.desc')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('expenseForm.date')}</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('expenseForm.category')}</Label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className={SELECT_CLASS}>
                <option value="maintenance">{t('expenseForm.catMaintenance')}</option>
                <option value="repair">{t('expenseForm.catRepairs')}</option>
                <option value="utilities">{t('expenseForm.catUtilities')}</option>
                <option value="insurance">{t('expenseForm.catInsurance')}</option>
                <option value="cleaning">{t('expenseForm.catCleaning')}</option>
                <option value="management">{t('expenseForm.catManagement')}</option>
                <option value="other">{t('expenseForm.catOther')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('expenseForm.description')}</Label>
            <Input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder={t('expenseForm.descPlaceholder')}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('expenseForm.amount')} ({getCurrencyCode()})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.cost}
                onChange={e => set('cost', e.target.value)}
                placeholder="0.00"
              />
              {errors.cost && <p className="text-xs text-destructive">{errors.cost}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('expenseForm.vendor')}</Label>
              <Input
                value={form.vendor}
                onChange={e => set('vendor', e.target.value)}
                placeholder={t('expenseForm.vendorPlaceholder')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('common.saving') : expense ? t('common.saveChanges') : t('expenseForm.addExpense')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
