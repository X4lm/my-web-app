import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const EMPTY = { name: '', address: '', type: 'apartment', rentAmount: '', status: 'available' }

export default function PropertyFormDialog({ open, onOpenChange, property, onSave, saving }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setForm(property ? { ...property } : EMPTY)
      setErrors({})
    }
  }, [open, property])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.address.trim()) e.address = 'Required'
    if (!form.rentAmount || isNaN(form.rentAmount) || Number(form.rentAmount) <= 0)
      e.rentAmount = 'Enter a valid amount'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) return setErrors(errs)
    onSave({ ...form, rentAmount: Number(form.rentAmount) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{property ? 'Edit Property' : 'Add Property'}</DialogTitle>
          <DialogDescription>
            {property ? 'Update the property details below.' : 'Fill in the details to add a new property.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="prop-name">Property name</Label>
            <Input
              id="prop-name"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Sunset Apartments Block A"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="prop-address">Address</Label>
            <Input
              id="prop-address"
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="e.g. 123 Main St, New York, NY"
            />
            {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prop-type">Type</Label>
              <select
                id="prop-type"
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="apartment">Apartment</option>
                <option value="villa">Villa</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-status">Status</Label>
              <select
                id="prop-status"
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prop-rent">Monthly rent (USD)</Label>
            <Input
              id="prop-rent"
              type="number"
              min="1"
              step="1"
              value={form.rentAmount}
              onChange={e => set('rentAmount', e.target.value)}
              placeholder="0"
            />
            {errors.rentAmount && <p className="text-xs text-destructive">{errors.rentAmount}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : property ? 'Save Changes' : 'Add Property'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
