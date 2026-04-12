import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { diffFields, hasUnits } from '@/lib/utils'
import ExpenseFormDialog from '@/components/ExpenseFormDialog'
import ChequeFormDialog from '@/components/ChequeFormDialog'
import RERACalculator from '@/components/RERACalculator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  DollarSign, TrendingUp, Percent, MoreHorizontal,
  Pencil, Trash2, Plus, Receipt, FileCheck, AlertCircle,
} from 'lucide-react'

const CATEGORY_LABELS = {
  maintenance: 'Maintenance',
  repair: 'Repair',
  utilities: 'Utilities',
  insurance: 'Insurance',
  cleaning: 'Cleaning',
  management: 'Management',
  other: 'Other',
}

export default function FinancialsTab({ propertyId, property }) {
  const { currentUser } = useAuth()
  const { t, formatCurrency, formatDate, getCurrencyCode } = useLocale()
  const [expenses, setExpenses] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [cheques, setCheques] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [chequeDialogOpen, setChequeDialogOpen] = useState(false)
  const [editingCheque, setEditingCheque] = useState(null)
  const [chequeSaving, setChequeSaving] = useState(false)

  const colPath = `users/${currentUser.uid}/properties/${propertyId}/expenses`
  const unitsPath = `users/${currentUser.uid}/properties/${propertyId}/units`
  const chequePath = `users/${currentUser.uid}/properties/${propertyId}/cheques`

  // Listen to expenses
  useEffect(() => {
    const q = query(collection(db, colPath), orderBy('date', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (err) => {
      logError('[Firestore] Expenses listen error:', err)
      setLoading(false)
    })
    return unsub
  }, [colPath])

  // Listen to units (for occupancy / rent calculations)
  useEffect(() => {
    const q = query(collection(db, unitsPath))
    const unsub = onSnapshot(q, (snap) => {
      setUnits(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [unitsPath])

  // Listen to cheques
  useEffect(() => {
    const q = query(collection(db, chequePath), orderBy('date', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setCheques(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [chequePath])

  // ── Calculations ──
  const isBuilding = hasUnits(property?.type)

  // Expected rent: for buildings use sum of unit rents, else property rent
  const expectedRent = isBuilding
    ? units.reduce((s, u) => s + Number(u.monthlyRent || 0), 0)
    : Number(property?.rentAmount || 0)

  // Collected rent: for buildings, sum of units with paymentStatus === 'paid'
  const collectedRent = isBuilding
    ? units.filter(u => u.paymentStatus === 'paid').reduce((s, u) => s + Number(u.monthlyRent || 0), 0)
    : (property?.status === 'occupied' ? Number(property?.rentAmount || 0) : 0)

  // Occupancy rate
  const totalUnits = isBuilding ? units.length : 1
  const occupiedUnits = isBuilding
    ? units.filter(u => u.tenantName && u.tenantName.trim()).length
    : (property?.status === 'occupied' ? 1 : 0)
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

  // Current year expenses
  const currentYear = new Date().getFullYear()
  const yearExpenses = expenses.filter(e => e.date && e.date.startsWith(String(currentYear)))
  const totalExpenses = yearExpenses.reduce((s, e) => s + Number(e.cost || 0), 0)

  // Annual income = (collected rent × 12) − total expenses (simple estimate)
  const annualIncome = (collectedRent * 12) - totalExpenses

  // Monthly breakdown for current year
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, '0')
    const prefix = `${currentYear}-${month}`
    const monthExpenses = yearExpenses
      .filter(e => e.date && e.date.startsWith(prefix))
      .reduce((s, e) => s + Number(e.cost || 0), 0)
    return { month: i, label: new Date(currentYear, i).toLocaleString('default', { month: 'short' }), expenses: monthExpenses }
  })

  // ── CRUD ──
  const logPath = `users/${currentUser.uid}/properties/${propertyId}/logs`
  const authorName = currentUser.displayName || currentUser.email || 'Unknown'

  async function handleSave(data) {
    setSaving(true)
    try {
      if (editing) {
        const changes = diffFields(editing, data, {
          description: 'Description', cost: 'Cost', category: 'Category', date: 'Date', vendor: 'Vendor', notes: 'Notes',
        })
        await updateDoc(doc(db, colPath, editing.id), { ...data, updatedAt: serverTimestamp() })
        await addDoc(collection(db, logPath), {
          action: 'expense_updated', author: authorName,
          details: `Updated expense: ${data.description}`,
          changes,
          timestamp: serverTimestamp(),
        })
      } else {
        await addDoc(collection(db, colPath), { ...data, createdAt: serverTimestamp() })
        await addDoc(collection(db, logPath), {
          action: 'expense_added', author: authorName,
          details: `Added expense: ${data.description} (${getCurrencyCode()} ${data.cost})`,
          timestamp: serverTimestamp(),
        })
      }
      setDialogOpen(false)
      setEditing(null)
    } catch (err) {
      logError('[Firestore] Expense save error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense?')) return
    try {
      const exp = expenses.find(e => e.id === id)
      await deleteDoc(doc(db, colPath, id))
      await addDoc(collection(db, logPath), {
        action: 'expense_deleted', author: authorName,
        details: `Deleted expense: ${exp?.description || id}`,
        timestamp: serverTimestamp(),
      })
    } catch (err) {
      logError('[Firestore] Expense delete error:', err)
    }
  }

  function openAdd() { setEditing(null); setDialogOpen(true) }
  function openEdit(exp) { setEditing(exp); setDialogOpen(true) }

  // ── Cheque CRUD ──
  async function handleChequeSave(data) {
    setChequeSaving(true)
    try {
      if (editingCheque) {
        await updateDoc(doc(db, chequePath, editingCheque.id), { ...data, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, chequePath), { ...data, createdAt: serverTimestamp() })
      }
      setChequeDialogOpen(false)
      setEditingCheque(null)
    } catch (err) {
      logError('[Firestore] Cheque save error:', err)
    } finally {
      setChequeSaving(false)
    }
  }

  async function handleChequeDelete(id) {
    if (!window.confirm('Delete this cheque?')) return
    try {
      await deleteDoc(doc(db, chequePath, id))
    } catch (err) {
      logError('[Firestore] Cheque delete error:', err)
    }
  }

  // Cheque stats
  const pendingCheques = cheques.filter(c => c.status === 'pending')
  const bouncedCheques = cheques.filter(c => c.status === 'bounced')
  const totalPending = pendingCheques.reduce((s, c) => s + Number(c.amount || 0), 0)
  const upcomingCheques = pendingCheques.filter(c => {
    if (!c.date) return false
    const d = new Date(c.date)
    const now = new Date()
    const diff = (d - now) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 30
  })

  const CHEQUE_STATUS = {
    pending: { label: 'Pending', variant: 'warning' },
    deposited: { label: 'Deposited', variant: 'secondary' },
    cleared: { label: 'Cleared', variant: 'success' },
    bounced: { label: 'Bounced', variant: 'destructive' },
    cancelled: { label: 'Cancelled', variant: 'secondary' },
  }

  const PAYMENT_TYPE_LABELS = {
    rent: 'Rent', security_deposit: 'Security Deposit', advance: 'Advance', other: 'Other',
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('financials.expectedRent')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(expectedRent)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('financials.perMonth')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('financials.collectedRent')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(collectedRent)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {expectedRent > 0
                ? `${Math.round((collectedRent / expectedRent) * 100)}${t('financials.collectionRate')}`
                : t('financials.noRentExpected')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isBuilding ? t('financials.occupancyRate') : t('financials.statusLabel')}
            </CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isBuilding ? (
              <>
                <div className="text-2xl font-semibold">{occupancyRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {occupiedUnits} of {totalUnits} units occupied
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-semibold">{property?.status === 'occupied' ? t('common.occupied') : t('units.vacant')}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {property?.status === 'occupied' ? t('financials.currentlyRented') : t('financials.availableForRent')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('financials.annualNetIncome')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${annualIncome < 0 ? 'text-destructive' : ''}`}>
              {formatCurrency(annualIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{currentYear} {t('financials.estimate')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly expense breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{currentYear} {t('financials.monthlyExpenses')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {monthlyData.map(m => {
              const maxExp = Math.max(...monthlyData.map(d => d.expenses), 1)
              const h = m.expenses > 0 ? Math.max((m.expenses / maxExp) * 100, 4) : 0
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                    <div
                      className="w-full max-w-[28px] bg-primary/80 rounded-t"
                      style={{ height: `${h}%` }}
                      title={formatCurrency(m.expenses)}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-3 text-sm">
            <span className="text-muted-foreground">Total {currentYear} expenses:</span>
            <span className="font-semibold">{formatCurrency(totalExpenses)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Expense log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4" /> {t('financials.expenseLog')}
            </CardTitle>
            <Button onClick={openAdd} size="sm">
              <Plus className="w-4 h-4" /> {t('financials.addExpense')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t('financials.loadingExpenses')}</p>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium">{t('financials.noExpenses')}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t('financials.trackExpenses')}</p>
              <Button onClick={openAdd} size="sm" className="mt-4">
                <Plus className="w-4 h-4" /> {t('financials.addExpense')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('common.category')}</TableHead>
                  <TableHead>{t('common.description')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('financials.vendor')}</TableHead>
                  <TableHead className="text-right">{t('common.amount')}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(exp => (
                  <TableRow key={exp.id}>
                    <TableCell className="text-sm">{formatDate(exp.date)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{CATEGORY_LABELS[exp.category] || exp.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{exp.description}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {exp.vendor || '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(exp.cost)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(exp)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(exp.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cheque Tracking */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="w-4 h-4" /> {t('financials.chequeTracking')}
            </CardTitle>
            <Button onClick={() => { setEditingCheque(null); setChequeDialogOpen(true) }} size="sm">
              <Plus className="w-4 h-4" /> {t('financials.addCheque')}
            </Button>
          </div>
          {(pendingCheques.length > 0 || bouncedCheques.length > 0) && (
            <div className="flex gap-4 mt-2 flex-wrap">
              {pendingCheques.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-amber-600">{pendingCheques.length}</span> {t('financials.pendingCheques')} ({formatCurrency(totalPending)})
                </p>
              )}
              {upcomingCheques.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-blue-600">{upcomingCheques.length}</span> {t('financials.dueWithin30Cheques')}
                </p>
              )}
              {bouncedCheques.length > 0 && (
                <p className="text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-destructive" />
                  <span className="font-medium text-destructive">{bouncedCheques.length} {t('financials.bouncedCheques')}</span>
                </p>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {cheques.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCheck className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium">{t('financials.noCheques')}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t('financials.trackCheques')}</p>
              <Button onClick={() => { setEditingCheque(null); setChequeDialogOpen(true) }} size="sm" className="mt-4">
                <Plus className="w-4 h-4" /> {t('financials.addCheque')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.date')}</TableHead>
                    <TableHead>{t('financials.chequeNumber')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('financials.bank')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('financials.payer')}</TableHead>
                    <TableHead>{t('common.type')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="text-right">{t('common.amount')}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cheques.map(ch => {
                    const st = CHEQUE_STATUS[ch.status] || CHEQUE_STATUS.pending
                    const isOverdue = ch.status === 'pending' && ch.date && new Date(ch.date) < new Date()
                    return (
                      <TableRow key={ch.id} className={isOverdue ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                        <TableCell className="text-sm">{formatDate(ch.date)}</TableCell>
                        <TableCell className="font-mono text-sm">{ch.chequeNumber}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{ch.bankName}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{ch.payerName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {PAYMENT_TYPE_LABELS[ch.paymentType] || ch.paymentType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(ch.amount)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingCheque(ch); setChequeDialogOpen(true) }}>
                                <Pencil className="mr-2 h-3.5 w-3.5" /> {t('common.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleChequeDelete(ch.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> {t('common.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ChequeFormDialog
        open={chequeDialogOpen}
        onOpenChange={(open) => { if (!chequeSaving) { setChequeDialogOpen(open); if (!open) setEditingCheque(null) } }}
        cheque={editingCheque}
        onSave={handleChequeSave}
        saving={chequeSaving}
      />

      {/* RERA Calculator */}
      <RERACalculator />

      <ExpenseFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { if (!saving) { setDialogOpen(open); if (!open) setEditing(null) } }}
        expense={editing}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  )
}
