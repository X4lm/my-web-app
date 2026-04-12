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
import { useLocale } from '@/contexts/LocaleContext'
import { validateAmount } from '@/utils/validation'

const EMPTY = {
  name: '', address: '', type: 'villa', rentAmount: '', status: 'available',
  yearBuilt: '', totalArea: '', marketValue: '', titleDeedNumber: '',
  insuranceExpiry: '', municipalityPermitExpiry: '',
  coverPhoto: '', floorPlan: '',
  titleDeedDoc: '', insuranceCertDoc: '', permitDoc: '',
}

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

export default function PropertyFormDialog({ open, onOpenChange, property, onSave, saving }) {
  const { t, getCurrencyCode } = useLocale()
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
    if (!form.name.trim()) e.name = t('common.required')
    if (!form.address.trim()) e.address = t('common.required')
    const amtErr = validateAmount(form.rentAmount)
    if (amtErr) e.rentAmount = amtErr
    if (form.marketValue) {
      const mvErr = validateAmount(form.marketValue)
      if (mvErr) e.marketValue = mvErr
    }
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
          <DialogTitle>{property ? t('propertyForm.editProperty') : t('propertyForm.addProperty')}</DialogTitle>
          <DialogDescription>
            {property ? t('propertyForm.editDesc') : t('propertyForm.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="prop-name">{t('propertyForm.propertyName')}</Label>
            <Input
              id="prop-name"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              maxLength={200}
              placeholder={t('propertyForm.namePlaceholder')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="prop-address">{t('propertyForm.address')}</Label>
            <Input
              id="prop-address"
              value={form.address}
              onChange={e => set('address', e.target.value)}
              maxLength={500}
              placeholder={t('propertyForm.addressPlaceholder')}
            />
            {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prop-type">{t('propertyForm.type')}</Label>
              <select
                id="prop-type"
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="villa">{t('type.villa')}</option>
                <option value="townhouse">{t('type.townhouse')}</option>
                <option value="apartment">{t('type.apartment')}</option>
                <option value="residential_building">{t('type.residential_building')}</option>
                <option value="commercial_building">{t('type.commercial_building')}</option>
                <option value="mixed_use">{t('type.mixed_use')}</option>
                <option value="office">{t('type.office')}</option>
                <option value="retail">{t('type.retail')}</option>
                <option value="warehouse">{t('type.warehouse')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-status">{t('propertyForm.status')}</Label>
              <select
                id="prop-status"
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="available">{t('common.available')}</option>
                <option value="occupied">{t('common.occupied')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prop-rent">{t('propertyForm.monthlyRent')} ({getCurrencyCode()})</Label>
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
              <Label htmlFor="prop-year">{t('propertyForm.yearBuilt')}</Label>
              <Input
                id="prop-year"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={form.yearBuilt}
                onChange={e => set('yearBuilt', e.target.value)}
                placeholder={t('propertyForm.yearPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prop-area">{t('propertyForm.totalArea')}</Label>
              <Input
                id="prop-area"
                type="number"
                min="0"
                value={form.totalArea}
                onChange={e => set('totalArea', e.target.value)}
                placeholder={t('propertyForm.areaPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-market">{t('propertyForm.marketValue')} ({getCurrencyCode()})</Label>
              <Input
                id="prop-market"
                type="number"
                min="0"
                value={form.marketValue}
                onChange={e => set('marketValue', e.target.value)}
                placeholder={t('propertyForm.marketPlaceholder')}
              />
            </div>
          </div>

          <Separator />

          {/* Documents */}
          <p className="text-sm font-semibold text-muted-foreground">{t('propertyForm.documentsPermits')}</p>

          <div className="space-y-2">
            <Label htmlFor="prop-deed">{t('propertyForm.titleDeed')}</Label>
            <Input
              id="prop-deed"
              value={form.titleDeedNumber}
              onChange={e => set('titleDeedNumber', e.target.value)}
              maxLength={50}
              placeholder={t('propertyForm.deedPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prop-insurance">{t('propertyForm.insuranceExpiry')}</Label>
              <Input
                id="prop-insurance"
                type="date"
                value={form.insuranceExpiry}
                onChange={e => set('insuranceExpiry', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-permit">{t('propertyForm.municipalityPermit')}</Label>
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
              label={t('propertyForm.titleDeed')}
            />
            <DocumentUpload
              value={form.insuranceCertDoc}
              onChange={url => set('insuranceCertDoc', url)}
              folder="insurance"
              label={t('propertyForm.insuranceExpiry')}
            />
            <DocumentUpload
              value={form.permitDoc}
              onChange={url => set('permitDoc', url)}
              folder="permits"
              label={t('propertyForm.municipalityPermit')}
            />
          </div>

          <Separator />

          {/* Images */}
          <p className="text-sm font-semibold text-muted-foreground">{t('propertyForm.images')}</p>

          <div className="grid grid-cols-2 gap-4">
            <ImageUpload
              value={form.coverPhoto}
              onChange={url => set('coverPhoto', url)}
              folder="covers"
              label={t('propertyForm.coverPhoto')}
            />
            <ImageUpload
              value={form.floorPlan}
              onChange={url => set('floorPlan', url)}
              folder="floorplans"
              label={t('propertyForm.floorPlan')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('common.saving') : property ? t('common.saveChanges') : t('propertyForm.addProperty')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
