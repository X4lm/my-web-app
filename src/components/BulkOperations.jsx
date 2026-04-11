import { useState } from 'react'
import {
  collection, getDocs, updateDoc, doc, writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Layers, TrendingUp, FileDown, FileUp, Loader2, CheckCircle2,
} from 'lucide-react'

export default function BulkOperations({ propertyId, property }) {
  const { currentUser } = useAuth()
  const { formatCurrency } = useLocale()
  const [rentDialogOpen, setRentDialogOpen] = useState(false)
  const [increasePercent, setIncreasePercent] = useState('5')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [exporting, setExporting] = useState(false)

  const basePath = `users/${currentUser.uid}/properties/${propertyId}`

  async function applyBulkRentIncrease() {
    const pct = Number(increasePercent)
    if (!pct || pct <= 0 || pct > 100) return
    setProcessing(true)
    setResult(null)
    try {
      const unitsSnap = await getDocs(collection(db, `${basePath}/units`))
      const batch = writeBatch(db)
      let updated = 0

      unitsSnap.docs.forEach(d => {
        const data = d.data()
        const currentRent = Number(data.monthlyRent || 0)
        if (currentRent > 0) {
          const newRent = Math.round(currentRent * (1 + pct / 100))
          batch.update(doc(db, `${basePath}/units`, d.id), {
            monthlyRent: newRent,
            previousRent: currentRent,
            lastRentUpdate: new Date().toISOString().slice(0, 10),
          })
          updated++
        }
      })

      if (updated > 0) {
        await batch.commit()
      }
      setResult({ success: true, message: `Updated rent for ${updated} unit${updated !== 1 ? 's' : ''} by ${pct}%` })
      setRentDialogOpen(false)
    } catch (err) {
      console.error('[Bulk] Rent increase error:', err)
      setResult({ success: false, message: 'Failed to update rents. Please try again.' })
    } finally {
      setProcessing(false)
    }
  }

  async function exportCSV() {
    setExporting(true)
    try {
      const unitsSnap = await getDocs(collection(db, `${basePath}/units`))
      const units = unitsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      const headers = ['Unit Number', 'Type', 'Tenant Name', 'Tenant Phone', 'Tenant Email',
        'Monthly Rent', 'Payment Status', 'Condition', 'Lease Start', 'Lease End',
        'Ejari Number', 'Payment Frequency', 'Annual Rent', 'Notes']

      const rows = units.map(u => [
        u.unitNumber || '', u.unitType || '', u.tenantName || '', u.tenantPhone || '',
        u.tenantEmail || '', u.monthlyRent || '', u.paymentStatus || '', u.condition || '',
        u.leaseStart || '', u.leaseEnd || '', u.ejariNumber || '', u.paymentFrequency || '',
        u.annualRent || '', u.notes || '',
      ])

      const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${property?.name?.replace(/\s+/g, '_') || 'units'}_export_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[Bulk] CSV export error:', err)
    } finally {
      setExporting(false)
    }
  }

  async function importCSV(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setProcessing(true)
    setResult(null)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) {
        setResult({ success: false, message: 'CSV file is empty or has no data rows.' })
        return
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
      const unitNumIdx = headers.findIndex(h => h.toLowerCase().includes('unit number'))
      const rentIdx = headers.findIndex(h => h.toLowerCase().includes('monthly rent'))
      const tenantIdx = headers.findIndex(h => h.toLowerCase().includes('tenant name'))
      const phoneIdx = headers.findIndex(h => h.toLowerCase().includes('tenant phone'))

      if (unitNumIdx === -1) {
        setResult({ success: false, message: 'CSV must have a "Unit Number" column.' })
        return
      }

      // Load existing units
      const unitsSnap = await getDocs(collection(db, `${basePath}/units`))
      const unitsByNumber = {}
      unitsSnap.docs.forEach(d => {
        const data = d.data()
        if (data.unitNumber) unitsByNumber[data.unitNumber] = d.id
      })

      const batch = writeBatch(db)
      let updated = 0

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/("([^"]*("")*)*"|[^,]*)(,|$)/g)?.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').replace(/,$/, '').trim()) || []
        const unitNum = values[unitNumIdx]
        if (!unitNum || !unitsByNumber[unitNum]) continue

        const updates = {}
        if (rentIdx !== -1 && values[rentIdx]) updates.monthlyRent = Number(values[rentIdx]) || 0
        if (tenantIdx !== -1 && values[tenantIdx]) updates.tenantName = values[tenantIdx]
        if (phoneIdx !== -1 && values[phoneIdx]) updates.tenantPhone = values[phoneIdx]

        if (Object.keys(updates).length > 0) {
          batch.update(doc(db, `${basePath}/units`, unitsByNumber[unitNum]), updates)
          updated++
        }
      }

      if (updated > 0) await batch.commit()
      setResult({ success: true, message: `Updated ${updated} unit${updated !== 1 ? 's' : ''} from CSV.` })
    } catch (err) {
      console.error('[Bulk] CSV import error:', err)
      setResult({ success: false, message: 'Failed to import CSV. Check file format.' })
    } finally {
      setProcessing(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4" /> Bulk Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => { setRentDialogOpen(true); setResult(null) }}>
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm">Bulk Rent Increase</span>
              <span className="text-xs text-muted-foreground">Apply % increase to all units</span>
            </Button>

            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={exportCSV} disabled={exporting}>
              {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
              <span className="text-sm">Export CSV</span>
              <span className="text-xs text-muted-foreground">Download all unit data</span>
            </Button>

            <label className="cursor-pointer">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full pointer-events-none" disabled={processing}>
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileUp className="w-5 h-5" />}
                <span className="text-sm">Import CSV</span>
                <span className="text-xs text-muted-foreground">Update units from CSV file</span>
              </Button>
              <input type="file" accept=".csv" onChange={importCSV} className="hidden" disabled={processing} />
            </label>
          </div>

          {result && (
            <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${result.success ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300' : 'bg-destructive/10 text-destructive'}`}>
              {result.success ? <CheckCircle2 className="w-4 h-4" /> : null}
              {result.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Rent Increase Dialog */}
      <Dialog open={rentDialogOpen} onOpenChange={open => { if (!processing) setRentDialogOpen(open) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bulk Rent Increase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Apply a percentage increase to the monthly rent of all units in this property.
            </p>
            <div className="space-y-2">
              <Label>Increase Percentage (%)</Label>
              <Input
                type="number"
                value={increasePercent}
                onChange={e => setIncreasePercent(e.target.value)}
                min="1" max="100" step="0.5"
              />
              <p className="text-xs text-muted-foreground">
                RERA max: 0-5% (within 10% of market), 5-10% (11-20% below), 10-15% (21-30%), 15-20% (30%+)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRentDialogOpen(false)} disabled={processing}>Cancel</Button>
            <Button onClick={applyBulkRentIncrease} disabled={processing || !increasePercent}>
              {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Applying...</> : `Apply ${increasePercent}% Increase`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
