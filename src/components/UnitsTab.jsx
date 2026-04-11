import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import UnitFormDialog from '@/components/UnitFormDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Pencil, Trash2, DoorOpen } from 'lucide-react'

const UNIT_TYPE_LABELS = { studio: 'Studio', '1br': '1 BR', '2br': '2 BR', '3br': '3 BR' }
const CONDITION_LABELS = { good: 'Good', needs_attention: 'Needs Attention', critical: 'Critical' }
const PAYMENT_VARIANT = { paid: 'success', pending: 'warning', overdue: 'destructive' }
const PAYMENT_LABELS = { paid: 'Paid', pending: 'Pending', overdue: 'Overdue' }
const CONDITION_VARIANT = { good: 'success', needs_attention: 'warning', critical: 'destructive' }

export default function UnitsTab({ propertyId }) {
  const { currentUser } = useAuth()
  const { formatCurrency } = useLocale()
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const basePath = `users/${currentUser.uid}/properties/${propertyId}/units`

  useEffect(() => {
    const q = query(collection(db, basePath), orderBy('unitNumber', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setUnits(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (err) => {
      console.error('[Firestore] Units listen error:', err.code, err.message)
      setLoading(false)
    })
    return unsub
  }, [basePath])

  async function handleSave(data) {
    setSaving(true)
    try {
      if (editing) {
        await updateDoc(doc(db, basePath, editing.id), { ...data, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, basePath), { ...data, createdAt: serverTimestamp() })
      }
      setDialogOpen(false)
      setEditing(null)
    } catch (err) {
      console.error('[Firestore] Unit save error:', err.code, err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this unit? This cannot be undone.')) return
    try {
      await deleteDoc(doc(db, basePath, id))
    } catch (err) {
      console.error('[Firestore] Unit delete error:', err.code, err.message)
    }
  }

  const occupied = units.filter(u => u.tenantName).length
  const totalRent = units.reduce((s, u) => s + Number(u.monthlyRent || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {units.length} {units.length === 1 ? 'unit' : 'units'} &middot; {occupied} occupied &middot; {formatCurrency(totalRent)}/mo total rent
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true) }}>
          <Plus className="w-4 h-4" />
          Add Unit
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Loading units...</p>
          ) : units.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <DoorOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-medium">No units yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Add units to this residential building.</p>
              <Button size="sm" className="mt-4" onClick={() => { setEditing(null); setDialogOpen(true) }}>
                <Plus className="w-4 h-4" /> Add Unit
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Tenant</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.unitNumber}</TableCell>
                    <TableCell>{u.floor}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary">{UNIT_TYPE_LABELS[u.unitType] || u.unitType}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {u.tenantName ? (
                        <div>
                          <p className="text-sm">{u.tenantName}</p>
                          <p className="text-xs text-muted-foreground">{u.tenantContact}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Vacant</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={PAYMENT_VARIANT[u.paymentStatus] || 'secondary'}>
                        {PAYMENT_LABELS[u.paymentStatus] || u.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={CONDITION_VARIANT[u.condition] || 'secondary'}>
                        {CONDITION_LABELS[u.condition] || u.condition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(u.monthlyRent)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(u); setDialogOpen(true) }}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(u.id)}
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
            </div>
          )}
        </CardContent>
      </Card>

      <UnitFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { if (!saving) { setDialogOpen(open); if (!open) setEditing(null) } }}
        unit={editing}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  )
}
