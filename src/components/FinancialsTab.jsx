import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import ExpenseFormDialog from '@/components/ExpenseFormDialog'
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
  Pencil, Trash2, Plus, Receipt,
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
  const [expenses, setExpenses] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const colPath = `users/${currentUser.uid}/properties/${propertyId}/expenses`
  const unitsPath = `users/${currentUser.uid}/properties/${propertyId}/units`

  // Listen to expenses
  useEffect(() => {
    const q = query(collection(db, colPath), orderBy('date', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (err) => {
      console.error('[Firestore] Expenses listen error:', err)
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

  // ── Calculations ──
  const isBuilding = property?.type === 'residential_building'

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
  async function handleSave(data) {
    setSaving(true)
    try {
      if (editing) {
        await updateDoc(doc(db, colPath, editing.id), { ...data, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, colPath), { ...data, createdAt: serverTimestamp() })
      }
      setDialogOpen(false)
      setEditing(null)
    } catch (err) {
      console.error('[Firestore] Expense save error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense?')) return
    try {
      await deleteDoc(doc(db, colPath, id))
    } catch (err) {
      console.error('[Firestore] Expense delete error:', err)
    }
  }

  function openAdd() { setEditing(null); setDialogOpen(true) }
  function openEdit(exp) { setEditing(exp); setDialogOpen(true) }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expected Rent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">${expectedRent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected Rent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">${collectedRent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {expectedRent > 0
                ? `${Math.round((collectedRent / expectedRent) * 100)}% collection rate`
                : 'No rent expected'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Occupancy Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{occupancyRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {occupiedUnits} of {totalUnits} {isBuilding ? 'units' : ''} occupied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Annual Net Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${annualIncome < 0 ? 'text-destructive' : ''}`}>
              ${annualIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{currentYear} estimate</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly expense breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{currentYear} Monthly Expenses</CardTitle>
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
                      title={`$${m.expenses.toLocaleString()}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-3 text-sm">
            <span className="text-muted-foreground">Total {currentYear} expenses:</span>
            <span className="font-semibold">${totalExpenses.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Expense log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Expense Log
            </CardTitle>
            <Button onClick={openAdd} size="sm">
              <Plus className="w-4 h-4" /> Add Expense
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading expenses...</p>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium">No expenses recorded</h3>
              <p className="text-sm text-muted-foreground mt-1">Track maintenance and operational costs.</p>
              <Button onClick={openAdd} size="sm" className="mt-4">
                <Plus className="w-4 h-4" /> Add Expense
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="hidden sm:table-cell">Vendor</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(exp => (
                  <TableRow key={exp.id}>
                    <TableCell className="text-sm">{exp.date}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{CATEGORY_LABELS[exp.category] || exp.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{exp.description}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {exp.vendor || '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">${Number(exp.cost || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(exp)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(exp.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
