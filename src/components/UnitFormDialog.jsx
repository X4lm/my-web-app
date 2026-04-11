import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const RESIDENTIAL_TYPES = ['studio', '1br', '2br', '3br']
const COMMERCIAL_TYPES = ['office', 'retail', 'warehouse', 'showroom']

const EMPTY = {
  unitNumber: '', floor: '', unitType: 'studio', size: '',
  tenantName: '', tenantContact: '', tenantEmail: '',
  tenantEmiratesId: '', tenantNationality: '', tenantCompany: '',
  emergencyContactName: '', emergencyContactPhone: '',
  leaseStart: '', leaseEnd: '',
  ejariNumber: '', contractNumber: '', paymentFrequency: 'monthly',
  annualRent: '',
  monthlyRent: '', paymentStatus: 'pending', securityDeposit: '',
  condition: 'good',
  tradeLicenseNumber: '', commercialActivity: '',
}

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

export default function UnitFormDialog({ open, onOpenChange, unit, onSave, saving, propertyType }) {
  const isCommercial = propertyType === 'commercial_building'
  const isMixed = propertyType === 'mixed_use'
  const unitTypes = isCommercial ? COMMERCIAL_TYPES : isMixed ? [...RESIDENTIAL_TYPES, ...COMMERCIAL_TYPES] : RESIDENTIAL_TYPES
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      const defaultType = isCommercial ? 'office' : 'studio'
      setForm(unit ? { ...EMPTY, ...unit } : { ...EMPTY, unitType: defaultType })
      setErrors({})
    }
  }, [open, unit])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }))
  }

  function validate() {
    const e = {}
    if (!form.unitNumber.toString().trim()) e.unitNumber = 'Required'
    if (!form.floor.toString().trim()) e.floor = 'Required'
    if (!form.monthlyRent || isNaN(form.monthlyRent) || Number(form.monthlyRent) <= 0)
      e.monthlyRent = 'Enter a valid amount'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) return setErrors(errs)
    onSave({
      ...form,
      monthlyRent: Number(form.monthlyRent),
      size: form.size ? Number(form.size) : '',
      securityDeposit: form.securityDeposit ? Number(form.securityDeposit) : '',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{unit ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
          <DialogDescription>
            {unit ? 'Update the unit details.' : 'Add a new unit to this property.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Unit Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Unit number</Label>
              <Input
                value={form.unitNumber}
                onChange={e => set('unitNumber', e.target.value)}
                placeholder="e.g. 101"
              />
              {errors.unitNumber && <p className="text-xs text-destructive">{errors.unitNumber}</p>}
            </div>
            <div className="space-y-2">
              <Label>Floor</Label>
              <Input
                value={form.floor}
                onChange={e => set('floor', e.target.value)}
                placeholder="e.g. 1"
              />
              {errors.floor && <p className="text-xs text-destructive">{errors.floor}</p>}
            </div>
            <div className="space-y-2">
              <Label>Size (sqm)</Label>
              <Input
                type="number"
                min="0"
                value={form.size}
                onChange={e => set('size', e.target.value)}
                placeholder="e.g. 85"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unit type</Label>
              <select value={form.unitType} onChange={e => set('unitType', e.target.value)} className={SELECT_CLASS}>
                {unitTypes.map(t => (
                  <option key={t} value={t}>
                    {t === 'studio' ? 'Studio' : t === '1br' ? '1 BR' : t === '2br' ? '2 BR' : t === '3br' ? '3 BR'
                      : t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <select value={form.condition} onChange={e => set('condition', e.target.value)} className={SELECT_CLASS}>
                <option value="good">Good</option>
                <option value="needs_attention">Needs Attention</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <Separator />
          <p className="text-sm font-semibold text-muted-foreground">Tenant Profile</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tenant name</Label>
              <Input
                value={form.tenantName}
                onChange={e => set('tenantName', e.target.value)}
                placeholder="Leave empty if vacant"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.tenantContact}
                onChange={e => set('tenantContact', e.target.value)}
                placeholder="e.g. +971 50 123 4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.tenantEmail}
                onChange={e => set('tenantEmail', e.target.value)}
                placeholder="tenant@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Emirates ID / Passport</Label>
              <Input
                value={form.tenantEmiratesId}
                onChange={e => set('tenantEmiratesId', e.target.value)}
                placeholder="784-XXXX-XXXXXXX-X"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nationality</Label>
              <Input
                value={form.tenantNationality}
                onChange={e => set('tenantNationality', e.target.value)}
                placeholder="e.g. UAE"
              />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={form.tenantCompany}
                onChange={e => set('tenantCompany', e.target.value)}
                placeholder="Employer or company name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Emergency contact name</Label>
              <Input
                value={form.emergencyContactName}
                onChange={e => set('emergencyContactName', e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Emergency contact phone</Label>
              <Input
                value={form.emergencyContactPhone}
                onChange={e => set('emergencyContactPhone', e.target.value)}
                placeholder="+971 ..."
              />
            </div>
          </div>

          <Separator />
          <p className="text-sm font-semibold text-muted-foreground">Lease & Contract</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lease start</Label>
              <Input type="date" value={form.leaseStart} onChange={e => set('leaseStart', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Lease end</Label>
              <Input type="date" value={form.leaseEnd} onChange={e => set('leaseEnd', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ejari number</Label>
              <Input
                value={form.ejariNumber}
                onChange={e => set('ejariNumber', e.target.value)}
                placeholder="e.g. 1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label>Contract number</Label>
              <Input
                value={form.contractNumber}
                onChange={e => set('contractNumber', e.target.value)}
                placeholder="e.g. CN-2024-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment frequency</Label>
              <select value={form.paymentFrequency} onChange={e => set('paymentFrequency', e.target.value)} className={SELECT_CLASS}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly (4 cheques)</option>
                <option value="semi_annual">Semi-Annual (2 cheques)</option>
                <option value="annual">Annual (1 cheque)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Annual rent</Label>
              <Input
                type="number"
                min="0"
                value={form.annualRent}
                onChange={e => set('annualRent', e.target.value)}
                placeholder="Total per year"
              />
            </div>
          </div>

          {COMMERCIAL_TYPES.includes(form.unitType) && (
            <>
              <Separator />
              <p className="text-sm font-semibold text-muted-foreground">Commercial Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trade license number</Label>
                  <Input
                    value={form.tradeLicenseNumber}
                    onChange={e => set('tradeLicenseNumber', e.target.value)}
                    placeholder="e.g. TL-2024-00456"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Commercial activity</Label>
                  <Input
                    value={form.commercialActivity}
                    onChange={e => set('commercialActivity', e.target.value)}
                    placeholder="e.g. Restaurant, Retail Shop"
                  />
                </div>
              </div>
            </>
          )}

          <Separator />
          <p className="text-sm font-semibold text-muted-foreground">Financials</p>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Monthly rent</Label>
              <Input
                type="number"
                min="0"
                value={form.monthlyRent}
                onChange={e => set('monthlyRent', e.target.value)}
                placeholder="0"
              />
              {errors.monthlyRent && <p className="text-xs text-destructive">{errors.monthlyRent}</p>}
            </div>
            <div className="space-y-2">
              <Label>Payment status</Label>
              <select value={form.paymentStatus} onChange={e => set('paymentStatus', e.target.value)} className={SELECT_CLASS}>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Security deposit</Label>
              <Input
                type="number"
                min="0"
                value={form.securityDeposit}
                onChange={e => set('securityDeposit', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : unit ? 'Save Changes' : 'Add Unit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
