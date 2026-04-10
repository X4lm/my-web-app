import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import ImageUpload from '@/components/ImageUpload'
import DocumentUpload from '@/components/DocumentUpload'

const EMPTY = {
  name: '', address: '', type: 'villa', rentAmount: '', status: 'available',
  yearBuilt: '', totalArea: '', marketValue: '', titleDeedNumber: '',
  insuranceExpiry: '', municipalityPermitExpiry: '',
  coverPhoto: '', floorPlan: '',
  titleDeedDoc: '', insuranceCertDoc: '', permitDoc: '',
}

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

export default function PropertyFormDialog({ open, onOpenChange, property, onSave, saving }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setForm(property ? { ...EMPTY, ...property } : EMPTY)
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
    const data = {
      ...form,
      rentAmount: Number(form.rentAmount),
      yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : '',
      totalArea: form.totalArea ? Number(form.totalArea) : '',
      marketValue: form.marketValue ? Number(form.marketValue) : '',
    }
    onSave(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{property ? 'Edit Property' : 'Add Property'}</DialogTitle>
          <DialogDescription>
            {property ? 'Update the property details below.' : 'Fill in the details to add a new property.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Basic Info */}
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
                className={SELECT_CLASS}
              >
                <option value="villa">Villa</option>
                <option value="townhouse">Townhouse</option>
                <option value="apartment">Apartment</option>
                <option value="residential_building">Residential Building</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-status">Status</Label>
              <select
                id="prop-status"
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prop-rent">Monthly rent (USD)</Label>
              <Input
                id="prop-rent"
                type="number"
                min="0"
                step="1"
                value={form.rentAmount}
                onChange={e => set('rentAmount', e.target.value)}
                placeholder="0"
              />
              {errors.rentAmount && <p className="text-xs text-destructive">{errors.rentAmount}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-year">Year built</Label>
              <Input
                id="prop-year"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={form.yearBuilt}
                onChange={e => set('yearBuilt', e.target.value)}
                placeholder="e.g. 2015"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prop-area">Total area (sqm)</Label>
              <Input
                id="prop-area"
                type="number"
                min="0"
                value={form.totalArea}
                onChange={e => set('totalArea', e.target.value)}
                placeholder="e.g. 250"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-market">Market value (USD)</Label>
              <Input
                id="prop-market"
                type="number"
                min="0"
                value={form.marketValue}
                onChange={e => set('marketValue', e.target.value)}
                placeholder="e.g. 500000"
              />
            </div>
          </div>

          <Separator />

          {/* Documents */}
          <p className="text-sm font-semibold text-muted-foreground">Documents & Permits</p>

          <div className="space-y-2">
            <Label htmlFor="prop-deed">Title deed number</Label>
            <Input
              id="prop-deed"
              value={form.titleDeedNumber}
              onChange={e => set('titleDeedNumber', e.target.value)}
              placeholder="e.g. TD-2024-00123"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prop-insurance">Insurance expiry</Label>
              <Input
                id="prop-insurance"
                type="date"
                value={form.insuranceExpiry}
                onChange={e => set('insuranceExpiry', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-permit">Municipality permit expiry</Label>
              <Input
                id="prop-permit"
                type="date"
                value={form.municipalityPermitExpiry}
                onChange={e => set('municipalityPermitExpiry', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <DocumentUpload
              value={form.titleDeedDoc}
              onChange={url => set('titleDeedDoc', url)}
              folder="title-deeds"
              label="Title Deed Document"
            />
            <DocumentUpload
              value={form.insuranceCertDoc}
              onChange={url => set('insuranceCertDoc', url)}
              folder="insurance"
              label="Insurance Certificate"
            />
            <DocumentUpload
              value={form.permitDoc}
              onChange={url => set('permitDoc', url)}
              folder="permits"
              label="Municipality Permit"
            />
          </div>

          <Separator />

          {/* Images */}
          <p className="text-sm font-semibold text-muted-foreground">Images</p>

          <div className="grid grid-cols-2 gap-4">
            <ImageUpload
              value={form.coverPhoto}
              onChange={url => set('coverPhoto', url)}
              folder="covers"
              label="Cover photo"
            />
            <ImageUpload
              value={form.floorPlan}
              onChange={url => set('floorPlan', url)}
              folder="floorplans"
              label="2D Floor plan"
            />
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
