import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const EMPTY = { date: '', category: 'maintenance', cost: '', vendor: '', description: '' }

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

export default function ExpenseFormDialog({ open, onOpenChange, expense, onSave, saving }) {
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
    if (!form.date) e.date = 'Required'
    if (!form.cost || isNaN(form.cost) || Number(form.cost) <= 0) e.cost = 'Enter a valid amount'
    if (!form.description.trim()) e.description = 'Required'
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
          <DialogTitle>{expense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          <DialogDescription>Log a maintenance or operational expense.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className={SELECT_CLASS}>
                <option value="maintenance">Maintenance</option>
                <option value="repair">Repair</option>
                <option value="utilities">Utilities</option>
                <option value="insurance">Insurance</option>
                <option value="cleaning">Cleaning</option>
                <option value="management">Management</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="e.g. AC unit repair in unit 201"
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cost (USD)</Label>
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
              <Label>Vendor</Label>
              <Input
                value={form.vendor}
                onChange={e => set('vendor', e.target.value)}
                placeholder="e.g. ABC Services"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : expense ? 'Save Changes' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
