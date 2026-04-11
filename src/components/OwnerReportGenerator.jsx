import { useState, useEffect } from 'react'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { hasUnits, TYPE_LABELS } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileDown, Loader2, Building2, DollarSign, Wrench, Calendar } from 'lucide-react'

export default function OwnerReportGenerator({ propertyId, property }) {
  const { currentUser } = useAuth()
  const { formatCurrency, formatDate, getCurrencyCode } = useLocale()
  const [generating, setGenerating] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)

  const basePath = `users/${currentUser.uid}/properties/${propertyId}`

  useEffect(() => {
    async function loadData() {
      try {
        const [unitsSnap, expensesSnap, chequesSnap, workOrdersSnap, inspectionsSnap] = await Promise.all([
          getDocs(query(collection(db, `${basePath}/units`))),
          getDocs(query(collection(db, `${basePath}/expenses`), orderBy('date', 'desc'))),
          getDocs(query(collection(db, `${basePath}/cheques`), orderBy('date', 'asc'))),
          getDocs(query(collection(db, `${basePath}/workOrders`), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, `${basePath}/inspections`), orderBy('createdAt', 'desc'))),
        ])

        const units = unitsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        const expenses = expensesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        const cheques = chequesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        const workOrders = workOrdersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        const inspections = inspectionsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

        const isBuilding = hasUnits(property?.type)
        const currentYear = new Date().getFullYear()
        const yearExpenses = expenses.filter(e => e.date?.startsWith(String(currentYear)))
        const totalExpenses = yearExpenses.reduce((s, e) => s + Number(e.cost || 0), 0)

        const expectedRent = isBuilding
          ? units.reduce((s, u) => s + Number(u.monthlyRent || 0), 0)
          : Number(property?.rentAmount || 0)

        const occupiedUnits = isBuilding
          ? units.filter(u => u.tenantName?.trim()).length
          : (property?.status === 'occupied' ? 1 : 0)
        const totalUnits = isBuilding ? units.length : 1
        const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

        const pendingCheques = cheques.filter(c => c.status === 'pending')
        const totalPendingAmount = pendingCheques.reduce((s, c) => s + Number(c.amount || 0), 0)
        const clearedCheques = cheques.filter(c => c.status === 'cleared')
        const totalCleared = clearedCheques.reduce((s, c) => s + Number(c.amount || 0), 0)

        const openWorkOrders = workOrders.filter(wo => wo.status === 'open' || wo.status === 'in_progress')
        const completedWorkOrders = workOrders.filter(wo => wo.status === 'completed')

        const latestInspection = inspections[0] || null

        // Category breakdown for expenses
        const categoryTotals = {}
        yearExpenses.forEach(e => {
          const cat = e.category || 'other'
          categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(e.cost || 0)
        })

        setReportData({
          units, expenses: yearExpenses, cheques, workOrders, inspections,
          isBuilding, expectedRent, occupiedUnits, totalUnits, occupancyRate,
          totalExpenses, categoryTotals, pendingCheques, totalPendingAmount,
          clearedCheques, totalCleared, openWorkOrders, completedWorkOrders,
          latestInspection, currentYear,
        })
      } catch (err) {
        console.error('[Report] Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [basePath, property])

  async function generatePDF() {
    setGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF()
      const d = reportData
      const currency = getCurrencyCode()
      const pageWidth = doc.internal.pageSize.getWidth()
      let y = 20

      // Title
      doc.setFontSize(18)
      doc.setFont(undefined, 'bold')
      doc.text('Property Owner Report', pageWidth / 2, y, { align: 'center' })
      y += 8
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' })
      y += 12

      // Property info
      doc.setFontSize(13)
      doc.setFont(undefined, 'bold')
      doc.text('Property Details', 14, y)
      y += 7
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      const info = [
        ['Name', property.name],
        ['Address', property.address || '—'],
        ['Type', TYPE_LABELS[property.type] || property.type],
        ['Status', property.status === 'occupied' ? 'Occupied' : 'Available'],
      ]
      if (property.yearBuilt) info.push(['Year Built', String(property.yearBuilt)])
      if (property.totalArea) info.push(['Total Area', `${Number(property.totalArea).toLocaleString()} sqm`])
      if (property.marketValue) info.push(['Market Value', `${currency} ${Number(property.marketValue).toLocaleString()}`])

      autoTable(doc, {
        startY: y,
        body: info,
        theme: 'plain',
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
        margin: { left: 14, right: 14 },
      })
      y = doc.lastAutoTable.finalY + 10

      // Financial summary
      doc.setFontSize(13)
      doc.setFont(undefined, 'bold')
      doc.text(`Financial Summary (${d.currentYear})`, 14, y)
      y += 7

      const annualIncome = (d.expectedRent * 12) - d.totalExpenses
      const financials = [
        ['Monthly Expected Rent', `${currency} ${d.expectedRent.toLocaleString()}`],
        ['Annual Expected Income', `${currency} ${(d.expectedRent * 12).toLocaleString()}`],
        ['Total Expenses (YTD)', `${currency} ${d.totalExpenses.toLocaleString()}`],
        ['Net Income (YTD Estimate)', `${currency} ${annualIncome.toLocaleString()}`],
        ['Occupancy Rate', `${d.occupancyRate}% (${d.occupiedUnits}/${d.totalUnits})`],
      ]

      autoTable(doc, {
        startY: y,
        body: financials,
        theme: 'striped',
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
        margin: { left: 14, right: 14 },
      })
      y = doc.lastAutoTable.finalY + 10

      // Expense breakdown by category
      if (Object.keys(d.categoryTotals).length > 0) {
        doc.setFontSize(13)
        doc.setFont(undefined, 'bold')
        doc.text('Expense Breakdown by Category', 14, y)
        y += 7

        const CATEGORY_LABELS = {
          maintenance: 'Maintenance', repair: 'Repair', utilities: 'Utilities',
          insurance: 'Insurance', cleaning: 'Cleaning', management: 'Management', other: 'Other',
        }
        const catRows = Object.entries(d.categoryTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, total]) => [
            CATEGORY_LABELS[cat] || cat,
            `${currency} ${total.toLocaleString()}`,
            `${Math.round((total / d.totalExpenses) * 100)}%`,
          ])

        autoTable(doc, {
          startY: y,
          head: [['Category', 'Amount', '% of Total']],
          body: catRows,
          theme: 'striped',
          margin: { left: 14, right: 14 },
        })
        y = doc.lastAutoTable.finalY + 10
      }

      // Cheque summary
      if (d.cheques.length > 0) {
        if (y > 240) { doc.addPage(); y = 20 }
        doc.setFontSize(13)
        doc.setFont(undefined, 'bold')
        doc.text('Cheque Summary', 14, y)
        y += 7

        const chequeStats = [
          ['Total Cheques', String(d.cheques.length)],
          ['Pending', `${d.pendingCheques.length} (${currency} ${d.totalPendingAmount.toLocaleString()})`],
          ['Cleared', `${d.clearedCheques.length} (${currency} ${d.totalCleared.toLocaleString()})`],
          ['Bounced', String(d.cheques.filter(c => c.status === 'bounced').length)],
        ]

        autoTable(doc, {
          startY: y,
          body: chequeStats,
          theme: 'plain',
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
          margin: { left: 14, right: 14 },
        })
        y = doc.lastAutoTable.finalY + 10
      }

      // Units table (for buildings)
      if (d.isBuilding && d.units.length > 0) {
        if (y > 220) { doc.addPage(); y = 20 }
        doc.setFontSize(13)
        doc.setFont(undefined, 'bold')
        doc.text('Units Overview', 14, y)
        y += 7

        const unitRows = d.units.map(u => [
          u.unitNumber || '—',
          u.tenantName || 'Vacant',
          `${currency} ${Number(u.monthlyRent || 0).toLocaleString()}`,
          u.leaseEnd || '—',
          u.paymentStatus === 'paid' ? 'Paid' : u.paymentStatus === 'overdue' ? 'Overdue' : 'Pending',
        ])

        autoTable(doc, {
          startY: y,
          head: [['Unit #', 'Tenant', 'Rent', 'Lease End', 'Payment']],
          body: unitRows,
          theme: 'striped',
          margin: { left: 14, right: 14 },
        })
        y = doc.lastAutoTable.finalY + 10
      }

      // Work orders summary
      if (d.workOrders.length > 0) {
        if (y > 230) { doc.addPage(); y = 20 }
        doc.setFontSize(13)
        doc.setFont(undefined, 'bold')
        doc.text('Work Orders Summary', 14, y)
        y += 7

        const woStats = [
          ['Total Work Orders', String(d.workOrders.length)],
          ['Open / In Progress', String(d.openWorkOrders.length)],
          ['Completed', String(d.completedWorkOrders.length)],
        ]

        autoTable(doc, {
          startY: y,
          body: woStats,
          theme: 'plain',
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
          margin: { left: 14, right: 14 },
        })
        y = doc.lastAutoTable.finalY + 10
      }

      // Latest inspection
      if (d.latestInspection) {
        if (y > 240) { doc.addPage(); y = 20 }
        doc.setFontSize(13)
        doc.setFont(undefined, 'bold')
        doc.text('Latest Inspection', 14, y)
        y += 7

        const insp = d.latestInspection
        const inspDate = insp.createdAt?.toDate
          ? insp.createdAt.toDate().toLocaleDateString()
          : 'Unknown'
        const items = insp.items || {}
        const conditions = Object.values(items).map(i => i.condition).filter(Boolean)
        const critical = conditions.filter(c => c === 'critical').length
        const poor = conditions.filter(c => c === 'poor').length
        const good = conditions.filter(c => c === 'good').length

        const inspInfo = [
          ['Date', inspDate],
          ['Inspector', insp.inspector || '—'],
          ['Items Inspected', String(conditions.length)],
          ['Good', String(good)],
          ['Critical Issues', String(critical)],
          ['Poor Condition', String(poor)],
        ]

        autoTable(doc, {
          startY: y,
          body: inspInfo,
          theme: 'plain',
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
          margin: { left: 14, right: 14 },
        })
      }

      // Footer on all pages
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setFont(undefined, 'normal')
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: 'center' })
        doc.text('PropManager — Confidential', 14, 290)
      }

      doc.save(`${property.name.replace(/\s+/g, '_')}_Report_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('[PDF] Generation error:', err)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Loading report data...</p>
        </CardContent>
      </Card>
    )
  }

  if (!reportData) return null

  const d = reportData
  const annualIncome = (d.expectedRent * 12) - d.totalExpenses

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileDown className="w-4 h-4" /> Owner Report
            </CardTitle>
            <Button onClick={generatePDF} disabled={generating} size="sm">
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><FileDown className="w-4 h-4" /> Download PDF</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Generate a comprehensive PDF report for this property including financials, occupancy, expenses, cheques, work orders, and inspection results.
          </p>

          {/* Quick preview stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <DollarSign className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="text-xs text-muted-foreground">Monthly Rent</p>
                <p className="font-semibold">{formatCurrency(d.expectedRent)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="text-xs text-muted-foreground">Occupancy</p>
                <p className="font-semibold">{d.occupancyRate}% ({d.occupiedUnits}/{d.totalUnits})</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Wrench className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="text-xs text-muted-foreground">Open Work Orders</p>
                <p className="font-semibold">{d.openWorkOrders.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Calendar className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="text-xs text-muted-foreground">Net Income ({d.currentYear})</p>
                <p className={`font-semibold ${annualIncome < 0 ? 'text-destructive' : ''}`}>
                  {formatCurrency(annualIncome)}
                </p>
              </div>
            </div>
          </div>

          {/* Report contents list */}
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Report includes:</p>
            <ul className="grid gap-1 sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">✓</Badge> Property details & overview
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">✓</Badge> Financial summary & net income
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">✓</Badge> Expense breakdown by category
              </li>
              {d.cheques.length > 0 && (
                <li className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">✓</Badge> Cheque tracking ({d.cheques.length} cheques)
                </li>
              )}
              {d.isBuilding && d.units.length > 0 && (
                <li className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">✓</Badge> Units overview ({d.units.length} units)
                </li>
              )}
              {d.workOrders.length > 0 && (
                <li className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">✓</Badge> Work orders ({d.workOrders.length} total)
                </li>
              )}
              {d.latestInspection && (
                <li className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">✓</Badge> Latest inspection results
                </li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
