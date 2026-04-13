import { useState, useEffect, useRef } from 'react'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { hasUnits, TYPE_LABELS } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2, Building2, DollarSign, Wrench, Calendar, Eye, X } from 'lucide-react'

export default function OwnerReportGenerator({ propertyId, property, ownerUid }) {
  const { currentUser } = useAuth()
  const { t, formatCurrency, formatDate, getCurrencyCode } = useLocale()
  const uid = ownerUid || currentUser.uid
  const [generating, setGenerating] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)
  const buildingPdf = useRef(false)

  const basePath = `users/${uid}/properties/${propertyId}`

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
        logError('[Report] Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [basePath, property])

  async function buildPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    const d = reportData
    const currency = getCurrencyCode()
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 20

    doc.setFontSize(18)
    doc.setFont(undefined, 'bold')
    doc.text(t('reports.title'), pageWidth / 2, y, { align: 'center' })
    y += 8
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(`${t('reports.generated')}: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' })
    y += 12

    doc.setFontSize(13)
    doc.setFont(undefined, 'bold')
    doc.text(t('reports.propertyDetails'), 14, y)
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

    autoTable(doc, { startY: y, body: info, theme: 'plain', columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }, margin: { left: 14, right: 14 } })
    y = doc.lastAutoTable.finalY + 10

    doc.setFontSize(13)
    doc.setFont(undefined, 'bold')
    doc.text(`${t('reports.financialSummary')} (${d.currentYear})`, 14, y)
    y += 7
    const annualIncome = (d.expectedRent * 12) - d.totalExpenses
    const financials = [
      ['Monthly Expected Rent', `${currency} ${d.expectedRent.toLocaleString()}`],
      ['Annual Expected Income', `${currency} ${(d.expectedRent * 12).toLocaleString()}`],
      ['Total Expenses (YTD)', `${currency} ${d.totalExpenses.toLocaleString()}`],
      ['Net Income (YTD Estimate)', `${currency} ${annualIncome.toLocaleString()}`],
      ['Occupancy Rate', `${d.occupancyRate}% (${d.occupiedUnits}/${d.totalUnits})`],
    ]
    autoTable(doc, { startY: y, body: financials, theme: 'striped', columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }, margin: { left: 14, right: 14 } })
    y = doc.lastAutoTable.finalY + 10

    if (Object.keys(d.categoryTotals).length > 0) {
      doc.setFontSize(13)
      doc.setFont(undefined, 'bold')
      doc.text(t('reports.expenseBreakdown'), 14, y)
      y += 7
      const CATEGORY_LABELS = { maintenance: 'Maintenance', repair: 'Repair', utilities: 'Utilities', insurance: 'Insurance', cleaning: 'Cleaning', management: 'Management', other: 'Other' }
      const catRows = Object.entries(d.categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, total]) => [CATEGORY_LABELS[cat] || cat, `${currency} ${total.toLocaleString()}`, `${Math.round((total / d.totalExpenses) * 100)}%`])
      autoTable(doc, { startY: y, head: [['Category', 'Amount', '% of Total']], body: catRows, theme: 'striped', margin: { left: 14, right: 14 } })
      y = doc.lastAutoTable.finalY + 10
    }

    if (d.cheques.length > 0) {
      if (y > 240) { doc.addPage(); y = 20 }
      doc.setFontSize(13)
      doc.setFont(undefined, 'bold')
      doc.text(t('reports.chequeSummary'), 14, y)
      y += 7
      const chequeStats = [
        ['Total Cheques', String(d.cheques.length)],
        ['Pending', `${d.pendingCheques.length} (${currency} ${d.totalPendingAmount.toLocaleString()})`],
        ['Cleared', `${d.clearedCheques.length} (${currency} ${d.totalCleared.toLocaleString()})`],
        ['Bounced', String(d.cheques.filter(c => c.status === 'bounced').length)],
      ]
      autoTable(doc, { startY: y, body: chequeStats, theme: 'plain', columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }, margin: { left: 14, right: 14 } })
      y = doc.lastAutoTable.finalY + 10
    }

    if (d.isBuilding && d.units.length > 0) {
      if (y > 220) { doc.addPage(); y = 20 }
      doc.setFontSize(13)
      doc.setFont(undefined, 'bold')
      doc.text(t('reports.unitsOverview'), 14, y)
      y += 7
      const unitRows = d.units.map(u => [u.unitNumber || '—', u.tenantName || 'Vacant', `${currency} ${Number(u.monthlyRent || 0).toLocaleString()}`, u.leaseEnd || '—', u.paymentStatus === 'paid' ? 'Paid' : u.paymentStatus === 'overdue' ? 'Overdue' : 'Pending'])
      autoTable(doc, { startY: y, head: [['Unit #', 'Tenant', 'Rent', 'Lease End', 'Payment']], body: unitRows, theme: 'striped', margin: { left: 14, right: 14 } })
      y = doc.lastAutoTable.finalY + 10
    }

    if (d.workOrders.length > 0) {
      if (y > 230) { doc.addPage(); y = 20 }
      doc.setFontSize(13)
      doc.setFont(undefined, 'bold')
      doc.text(t('reports.workOrdersSummary'), 14, y)
      y += 7
      const woStats = [['Total Work Orders', String(d.workOrders.length)], ['Open / In Progress', String(d.openWorkOrders.length)], ['Completed', String(d.completedWorkOrders.length)]]
      autoTable(doc, { startY: y, body: woStats, theme: 'plain', columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }, margin: { left: 14, right: 14 } })
      y = doc.lastAutoTable.finalY + 10
    }

    if (d.latestInspection) {
      if (y > 240) { doc.addPage(); y = 20 }
      doc.setFontSize(13)
      doc.setFont(undefined, 'bold')
      doc.text(t('reports.latestInspection'), 14, y)
      y += 7
      const insp = d.latestInspection
      const inspDate = insp.createdAt?.toDate ? insp.createdAt.toDate().toLocaleDateString() : 'Unknown'
      const items = insp.items || {}
      const conditions = Object.values(items).map(i => i.condition).filter(Boolean)
      const inspInfo = [['Date', inspDate], ['Inspector', insp.inspector || '—'], ['Items Inspected', String(conditions.length)], ['Good', String(conditions.filter(c => c === 'good').length)], ['Critical Issues', String(conditions.filter(c => c === 'critical').length)], ['Poor Condition', String(conditions.filter(c => c === 'poor').length)]]
      autoTable(doc, { startY: y, body: inspInfo, theme: 'plain', columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }, margin: { left: 14, right: 14 } })
    }

    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont(undefined, 'normal')
      doc.text(`${t('reports.page')} ${i} ${t('reports.of')} ${pageCount}`, pageWidth / 2, 290, { align: 'center' })
      doc.text(t('reports.confidential'), 14, 290)
    }

    return doc
  }

  async function generatePDF() {
    setGenerating(true)
    try {
      const doc = await buildPDF()
      doc.save(`${property.name.replace(/\s+/g, '_')}_Report_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      logError('[PDF] Generation error:', err)
    } finally {
      setGenerating(false)
    }
  }

  async function previewPDF() {
    setPreviewing(true)
    try {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
      const doc = await buildPDF()
      const blob = doc.output('blob')
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch (err) {
      logError('[PDF] Preview error:', err)
    } finally {
      setPreviewing(false)
    }
  }

  function closePdfPreview() {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl(null)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">{t('reports.loadingReport')}</p>
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
              <FileDown className="w-4 h-4" /> {t('reports.title')}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={previewPDF} disabled={previewing || generating} size="sm">
                {previewing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}</>
                ) : (
                  <><Eye className="w-4 h-4" /> {t('reports.previewPdf')}</>
                )}
              </Button>
              <Button onClick={generatePDF} disabled={generating || previewing} size="sm">
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}</>
                ) : (
                  <><FileDown className="w-4 h-4" /> {t('reports.downloadPdf')}</>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t('reports.generateDesc')}
          </p>

          {/* Quick preview stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <DollarSign className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="text-xs text-muted-foreground">{t('property.monthlyRent')}</p>
                <p className="font-semibold">{formatCurrency(d.expectedRent)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="text-xs text-muted-foreground">{t('dashboard.occupancy')}</p>
                <p className="font-semibold">{d.occupancyRate}% ({d.occupiedUnits}/{d.totalUnits})</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Wrench className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="text-xs text-muted-foreground">{t('workOrders.title')}</p>
                <p className="font-semibold">{d.openWorkOrders.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Calendar className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="text-xs text-muted-foreground">{t('portfolio.netIncome')} ({d.currentYear})</p>
                <p className={`font-semibold ${annualIncome < 0 ? 'text-destructive' : ''}`}>
                  {formatCurrency(annualIncome)}
                </p>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Floating PDF Modal */}
      {pdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={closePdfPreview}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-10 w-[95vw] max-w-4xl h-[90vh] bg-background rounded-xl shadow-2xl border flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4" /> {t('reports.reportPreview')}
              </h3>
              <div className="flex gap-2">
                <Button onClick={generatePDF} disabled={generating} size="sm" variant="outline">
                  <FileDown className="w-4 h-4" /> {t('common.download')}
                </Button>
                <Button variant="ghost" size="icon" onClick={closePdfPreview} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <iframe
              src={pdfUrl}
              title={t('reports.reportPreview')}
              className="flex-1 w-full"
            />
          </div>
        </div>
      )}
    </div>
  )
}
