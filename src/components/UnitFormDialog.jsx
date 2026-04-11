import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useLocale } from '@/contexts/LocaleContext'

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
  const { t } = useLocale()
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
    if (!form.unitNumber.toString().trim()) e.unitNumber = t('common.required')
    if (!form.floor.toString().trim()) e.floor = t('common.required')
    if (!form.monthlyRent || isNaN(form.monthlyRent) || Number(form.monthlyRent) <= 0)
      e.monthlyRent = t('common.validAmount')
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
          <DialogTitle>{unit ? t('unitForm.editUnit') : t('unitForm.addUnit')}</DialogTitle>
          <DialogDescription>
            {unit ? t('unitForm.editDesc') : t('unitForm.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Unit Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('unitForm.unitNumber')}</Label>
              <Input
                value={form.unitNumber}
                onChange={e => set('unitNumber', e.target.value)}
                placeholder={t('unitForm.unitPlaceholder')}
              />
              {errors.unitNumber && <p className="text-xs text-destructive">{errors.unitNumber}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('unitForm.floor')}</Label>
              <Input
                value={form.floor}
                onChange={e => set('floor', e.target.value)}
                placeholder={t('unitForm.floorPlaceholder')}
              />
              {errors.floor && <p className="text-xs text-destructive">{errors.floor}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('unitForm.sizeSqm')}</Label>
              <Input
                type="number"
                min="0"
                value={form.size}
                onChange={e => set('size', e.target.value)}
                placeholder={t('unitForm.sizePlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('unitForm.type')}</Label>
              <select value={form.unitType} onChange={e => set('unitType', e.target.value)} className={SELECT_CLASS}>
                {unitTypes.map(ut => (
                  <option key={ut} value={ut}>
                    {t(`type.${ut}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('unitForm.condition')}</Label>
              <select value={form.condition} onChange={e => set('condition', e.target.value)} className={SELECT_CLASS}>
                <option value="good">{t('unitForm.conditionGood')}</option>
                <option value="needs_attention">{t('unitForm.conditionNeedsAttention')}</option>
                <option value="critical">{t('unitForm.conditionCritical')}</option>
              </select>
            </div>
          </div>

          <Separator />
          <p className="text-sm font-semibold text-muted-foreground">{t('unitForm.tenantProfile')}</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('unitForm.tenantName')}</Label>
              <Input
                value={form.tenantName}
                onChange={e => set('tenantName', e.target.value)}
                placeholder={t('unitForm.tenantNameVacantPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('unitForm.tenantPhone')}</Label>
              <Input
                value={form.tenantContact}
                onChange={e => set('tenantContact', e.target.value)}
                placeholder={t('unitForm.tenantPhonePlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('unitForm.tenantEmail')}</Label>
              <Input
                type="email"
                value={form.tenantEmail}
                onChange={e => set('tenantEmail', e.target.value)}
                placeholder={t('unitForm.tenantEmailPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('unitForm.tenantId')}</Label>
              <Input
                value={form.tenantEmiratesId}
                onChange={e => set('tenantEmiratesId', e.target.value)}
                placeholder={t('unitForm.tenantIdPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('unitForm.tenantNationality')}</Label>
              <Input
                value={form.tenantNationality}
                onChange={e => set('tenantNationality', e.target.value)}
                placeholder={t('unitForm.nationalityPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('unitForm.tenantCompany')}</Label>
              <Input
                value={form.tenantCompany}
                onChange={e => set('tenantCompany', e.target.value)}
                placeholder={t('unitForm.companyPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('unitForm.emergencyContactName')}</Label>
              <Input
                value={form.emergencyContactName}
                onChange={e => set('emergencyContactName', e.target.value)}
                placeholder={t('unitForm.emergencyContactNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('unitForm.emergencyContactPhone')}</Label>
              <Input
                value={form.emergencyContactPhone}
                onChange={e => set('emergencyContactPhone', e.target.value)}
                placeholder={t('unitForm.emergencyContactPhonePlaceholder')}
              />
            </div>
          </div>

          <Separator />
          <p className="text-sm font-semibold text-muted-foreground">{t('unitForm.leaseContract')}</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('unitForm.leaseStart')}</Label>
              <Input type="date" value={form.leaseStart} onChange={e => set('leaseStart', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('unitForm.leaseEnd')}</Label>
              <Input type="date" value={form.leaseEnd} onChange={e => set('leaseEnd', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('unitForm.ejariNumber')}</Label>
              <Input
                value={form.ejariNumber}
                onChange={e => set('ejariNumber', e.target.value)}
                placeholder={t('unitForm.ejariPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('unitForm.contractNumber')}</Label>
              <Input
                value={form.contractNumber}
                onChange={e => set('contractNumber', e.target.value)}
                placeholder={t('unitForm.contractPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('unitForm.paymentFrequency')}</Label>
              <select value={form.paymentFrequency} onChange={e => set('paymentFrequency', e.target.value)} className={SELECT_CLASS}>
                <option value="monthly">{t('unitForm.freqMonthly')}</option>
                <option value="quarterly">{t('unitForm.freqQuarterly')}</option>
                <option value="semi_annual">{t('unitForm.freqSemiAnnual')}</option>
                <option value="annual">{t('unitForm.freqAnnual')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('unitForm.annualRent')}</Label>
              <Input
                type="number"
                min="0"
                value={form.annualRent}
                onChange={e => set('annualRent', e.target.value)}
                placeholder={t('unitForm.annualRentPlaceholder')}
              />
            </div>
          </div>

          {COMMERCIAL_TYPES.includes(form.unitType) && (
            <>
              <Separator />
              <p className="text-sm font-semibold text-muted-foreground">{t('unitForm.commercialDetails')}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('unitForm.tradeLicense')}</Label>
                  <Input
                    value={form.tradeLicenseNumber}
                    onChange={e => set('tradeLicenseNumber', e.target.value)}
                    placeholder={t('unitForm.tradeLicensePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('unitForm.commercialActivity')}</Label>
                  <Input
                    value={form.commercialActivity}
                    onChange={e => set('commercialActivity', e.target.value)}
                    placeholder={t('unitForm.commercialActivityPlaceholder')}
                  />
                </div>
              </div>
            </>
          )}

          <Separator />
          <p className="text-sm font-semibold text-muted-foreground">{t('unitForm.financials')}</p>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('unitForm.monthlyRent')}</Label>
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
              <Label>{t('unitForm.paymentStatus')}</Label>
              <select value={form.paymentStatus} onChange={e => set('paymentStatus', e.target.value)} className={SELECT_CLASS}>
                <option value="paid">{t('unitForm.paymentPaid')}</option>
                <option value="pending">{t('unitForm.paymentPending')}</option>
                <option value="overdue">{t('unitForm.paymentOverdue')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('unitForm.securityDeposit')}</Label>
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
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('common.saving') : unit ? t('common.saveChanges') : t('unitForm.addUnit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
