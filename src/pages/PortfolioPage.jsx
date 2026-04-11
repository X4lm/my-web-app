import { useState, useEffect } from 'react'
import { collection, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { hasUnits, TYPE_LABELS } from '@/lib/utils'
import AppLayout from '@/components/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DollarSign, TrendingUp, Building2, Percent, FileDown, Loader2,
} from 'lucide-react'

const VAT_RATE = 0.05
const COMMERCIAL_TYPES = new Set(['commercial_building', 'office', 'retail', 'warehouse'])

export default function PortfolioPage() {
  const { currentUser } = useAuth()
  const { formatCurrency, getCurrencyCode, t } = useLocale()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [propertyData, setPropertyData] = useState({})
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    const q = query(collection(db, 'users', currentUser.uid, 'properties'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, async (snap) => {
      const props = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setProperties(props)

      // Load units and expenses for each property
      const dataMap = {}
      await Promise.all(props.map(async (p) => {
        try {
          const [unitsSnap, expensesSnap] = await Promise.all([
            getDocs(collection(db, 'users', currentUser.uid, 'properties', p.id, 'units')),
            getDocs(query(collection(db, 'users', currentUser.uid, 'properties', p.id, 'expenses'), orderBy('date', 'desc'))),
          ])
          const units = unitsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          const expenses = expensesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          const currentYear = new Date().getFullYear()
          const yearExpenses = expenses.filter(e => e.date?.startsWith(String(currentYear)))
          const totalExpenses = yearExpenses.reduce((s, e) => s + Number(e.cost || 0), 0)

          const isBuilding = hasUnits(p.type)
          const expectedRent = isBuilding
            ? units.reduce((s, u) => s + Number(u.monthlyRent || 0), 0)
            : Number(p.rentAmount || 0)
          const occupiedUnits = isBuilding
            ? units.filter(u => u.tenantName?.trim()).length
            : (p.status === 'occupied' ? 1 : 0)
          const totalUnits = isBuilding ? units.length : 1

          const isCommercial = COMMERCIAL_TYPES.has(p.type)
          const annualRent = expectedRent * 12
          const vatAmount = isCommercial ? annualRent * VAT_RATE : 0
          const netIncome = annualRent - totalExpenses

          dataMap[p.id] = {
            units, expectedRent, occupiedUnits, totalUnits,
            totalExpenses, annualRent, vatAmount, netIncome,
            isCommercial, yearExpenses,
          }
        } catch {
          dataMap[p.id] = { units: [], expectedRent: 0, occupiedUnits: 0, totalUnits: 0, totalExpenses: 0, annualRent: 0, vatAmount: 0, netIncome: 0, isCommercial: false, yearExpenses: [] }
        }
      }))

      setPropertyData(dataMap)
      setLoading(false)
    })
    return unsub
  }, [currentUser])

  // Portfolio totals
  const totals = Object.values(propertyData).reduce((acc, d) => ({
    monthlyRent: acc.monthlyRent + d.expectedRent,
    annualRent: acc.annualRent + d.annualRent,
    totalExpenses: acc.totalExpenses + d.totalExpenses,
    netIncome: acc.netIncome + d.netIncome,
    vatLiability: acc.vatLiability + d.vatAmount,
    totalUnits: acc.totalUnits + d.totalUnits,
    occupiedUnits: acc.occupiedUnits + d.occupiedUnits,
  }), { monthlyRent: 0, annualRent: 0, totalExpenses: 0, netIncome: 0, vatLiability: 0, totalUnits: 0, occupiedUnits: 0 })

  const occupancyRate = totals.totalUnits > 0 ? Math.round((totals.occupiedUnits / totals.totalUnits) * 100) : 0

  async function exportPDF() {
    setGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape' })
      const currency = getCurrencyCode()
      const pw = doc.internal.pageSize.getWidth()

      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.text(t('portfolio.reportTitle'), pw / 2, 15, { align: 'center' })
      doc.setFontSize(9)
      doc.setFont(undefined, 'normal')
      doc.text(`Generated: ${new Date().toLocaleDateString()} | ${properties.length} ${t('portfolio.properties')} | ${totals.totalUnits} ${t('portfolio.units')}`, pw / 2, 22, { align: 'center' })

      const rows = properties.map(p => {
        const d = propertyData[p.id] || {}
        return [
          p.name,
          TYPE_LABELS[p.type] || p.type,
          `${d.occupiedUnits || 0}/${d.totalUnits || 0}`,
          `${currency} ${(d.expectedRent || 0).toLocaleString()}`,
          `${currency} ${(d.annualRent || 0).toLocaleString()}`,
          `${currency} ${(d.totalExpenses || 0).toLocaleString()}`,
          d.isCommercial ? `${currency} ${(d.vatAmount || 0).toLocaleString()}` : '—',
          `${currency} ${(d.netIncome || 0).toLocaleString()}`,
        ]
      })

      rows.push([
        'TOTAL', '', `${totals.occupiedUnits}/${totals.totalUnits}`,
        `${currency} ${totals.monthlyRent.toLocaleString()}`,
        `${currency} ${totals.annualRent.toLocaleString()}`,
        `${currency} ${totals.totalExpenses.toLocaleString()}`,
        `${currency} ${totals.vatLiability.toLocaleString()}`,
        `${currency} ${totals.netIncome.toLocaleString()}`,
      ])

      autoTable(doc, {
        startY: 28,
        head: [[t('portfolio.property'), t('portfolio.type'), t('portfolio.occupancy'), t('portfolio.monthlyRent'), t('portfolio.annualIncome'), t('portfolio.expensesYtd'), t('portfolio.vat'), t('portfolio.netIncome')]],
        body: rows,
        theme: 'striped',
        margin: { left: 10, right: 10 },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [50, 50, 50] },
        footStyles: { fontStyle: 'bold' },
      })

      doc.setFontSize(7)
      doc.text(t('portfolio.confidential'), 10, doc.internal.pageSize.getHeight() - 8)

      doc.save(`Portfolio_PL_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('[PDF] Portfolio export error:', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('portfolio.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('portfolio.subtitle')}
            </p>
          </div>
          <Button onClick={exportPDF} disabled={generating || loading} size="sm">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('portfolio.exporting')}</> : <><FileDown className="w-4 h-4" /> {t('portfolio.exportPdf')}</>}
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('portfolio.monthlyRent')}</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-semibold">{loading ? '—' : formatCurrency(totals.monthlyRent)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('portfolio.annualIncome')}</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-semibold">{loading ? '—' : formatCurrency(totals.annualRent)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('portfolio.expensesYtd')}</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-semibold text-destructive">{loading ? '—' : formatCurrency(totals.totalExpenses)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('portfolio.vatLiability')}</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-semibold">{loading ? '—' : formatCurrency(totals.vatLiability)}</div><p className="text-xs text-muted-foreground">{t('portfolio.vatOnCommercial')}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('portfolio.netIncome')}</CardTitle></CardHeader>
            <CardContent><div className={`text-xl font-semibold ${totals.netIncome < 0 ? 'text-destructive' : ''}`}>{loading ? '—' : formatCurrency(totals.netIncome)}</div></CardContent>
          </Card>
        </div>

        {/* Occupancy summary */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t('portfolio.occupancy')}: {occupancyRate}% ({totals.occupiedUnits}/{totals.totalUnits})</CardTitle></CardHeader>
          <CardContent>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${occupancyRate > 80 ? 'bg-emerald-500' : occupancyRate > 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${occupancyRate}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Property P&L table */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t('portfolio.plBreakdown')}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t('portfolio.loading')}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('portfolio.property')}</TableHead>
                      <TableHead>{t('portfolio.type')}</TableHead>
                      <TableHead>{t('portfolio.occupancy')}</TableHead>
                      <TableHead className="text-right">{t('portfolio.monthlyRent')}</TableHead>
                      <TableHead className="text-right">{t('portfolio.expensesYtd')}</TableHead>
                      <TableHead className="text-right">{t('portfolio.vat')}</TableHead>
                      <TableHead className="text-right">{t('portfolio.netIncome')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map(p => {
                      const d = propertyData[p.id] || {}
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[p.type] || p.type}</Badge></TableCell>
                          <TableCell>{d.occupiedUnits || 0}/{d.totalUnits || 0}</TableCell>
                          <TableCell className="text-right">{formatCurrency(d.expectedRent || 0)}</TableCell>
                          <TableCell className="text-right text-destructive">{formatCurrency(d.totalExpenses || 0)}</TableCell>
                          <TableCell className="text-right">{d.isCommercial ? formatCurrency(d.vatAmount || 0) : '—'}</TableCell>
                          <TableCell className={`text-right font-medium ${(d.netIncome || 0) < 0 ? 'text-destructive' : ''}`}>{formatCurrency(d.netIncome || 0)}</TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>{t('portfolio.total')} ({properties.length} {t('portfolio.properties')})</TableCell>
                      <TableCell />
                      <TableCell>{totals.occupiedUnits}/{totals.totalUnits}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totals.monthlyRent)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(totals.totalExpenses)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totals.vatLiability)}</TableCell>
                      <TableCell className={`text-right ${totals.netIncome < 0 ? 'text-destructive' : ''}`}>{formatCurrency(totals.netIncome)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
