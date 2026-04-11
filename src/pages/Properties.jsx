import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { diffFields } from '@/lib/utils'
import AppLayout from '@/components/AppLayout'
import PropertyFormDialog from '@/components/PropertyFormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from 'react-router-dom'
import { usePropertyAlerts } from '@/hooks/usePropertyAlerts'
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Building2, Eye, AlertCircle } from 'lucide-react'

const TYPE_LABELS = {
  villa: 'Villa',
  townhouse: 'Townhouse',
  apartment: 'Apartment',
  residential_building: 'Residential Building',
  commercial: 'Commercial',
}

export default function Properties() {
  const { currentUser } = useAuth()
  const { formatCurrency } = useLocale()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const { alertsByProperty } = usePropertyAlerts()

  useEffect(() => {
    const q = query(
      collection(db, 'users', currentUser.uid, 'properties'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      console.log('[Firestore] Properties loaded:', snap.docs.length)
      setProperties(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (err) => {
      console.error('[Firestore] Listen error:', err.code, err.message)
      setLoading(false)
    })
    return unsub
  }, [currentUser.uid])

  const filtered = properties.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (typeFilter !== 'all' && p.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.address.toLowerCase().includes(q)) return false
    }
    return true
  })

  async function handleSave(data) {
    setSaving(true)
    try {
      const col = collection(db, 'users', currentUser.uid, 'properties')
      const authorName = currentUser.displayName || currentUser.email || 'Unknown'
      const fieldLabels = {
        name: 'Name', address: 'Address', type: 'Type', status: 'Status',
        rentAmount: 'Rent Amount', yearBuilt: 'Year Built', totalArea: 'Total Area',
        marketValue: 'Market Value', titleDeedNumber: 'Title Deed',
        insuranceExpiry: 'Insurance Expiry', municipalityPermitExpiry: 'Municipality Permit Expiry',
      }
      if (editing) {
        console.log('[Firestore] Updating property:', editing.id)
        const changes = diffFields(editing, data, fieldLabels)
        await updateDoc(doc(db, 'users', currentUser.uid, 'properties', editing.id), {
          ...data, updatedAt: serverTimestamp(), updatedBy: authorName,
        })
        await addDoc(collection(db, 'users', currentUser.uid, 'properties', editing.id, 'logs'), {
          action: 'property_updated',
          author: authorName,
          details: changes.length > 0 ? `Changed ${changes.map(c => c.field).join(', ')}` : 'Property details updated',
          changes,
          timestamp: serverTimestamp(),
        })
      } else {
        console.log('[Firestore] Adding new property')
        const newDoc = await addDoc(col, { ...data, createdAt: serverTimestamp(), createdBy: authorName })
        await addDoc(collection(db, 'users', currentUser.uid, 'properties', newDoc.id, 'logs'), {
          action: 'property_created',
          author: authorName,
          details: `Created property: ${data.name}`,
          timestamp: serverTimestamp(),
        })
      }
      setDialogOpen(false)
      setEditing(null)
    } catch (err) {
      console.error('[Firestore] Save error:', err.code, err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this property? This cannot be undone.')) return
    try {
      console.log('[Firestore] Deleting property:', id)
      await deleteDoc(doc(db, 'users', currentUser.uid, 'properties', id))
    } catch (err) {
      console.error('[Firestore] Delete error:', err.code, err.message)
    }
  }

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(property) {
    setEditing(property)
    setDialogOpen(true)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
            <p className="text-muted-foreground text-sm">
              Manage your property listings.
            </p>
          </div>
          <Button onClick={openAdd} size="sm">
            <Plus className="w-4 h-4" />
            Add Property
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search properties..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">All Status</option>
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">All Types</option>
                  <option value="villa">Villa</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="apartment">Apartment</option>
                  <option value="residential_building">Residential Building</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-sm text-muted-foreground py-12 text-center">Loading properties...</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <h3 className="text-sm font-medium">
                  {properties.length === 0 ? 'No properties yet' : 'No results found'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {properties.length === 0
                    ? 'Get started by adding your first property.'
                    : 'Try adjusting your search or filters.'}
                </p>
                {properties.length === 0 && (
                  <Button onClick={openAdd} size="sm" className="mt-4">
                    <Plus className="w-4 h-4" />
                    Add Property
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Rent</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/properties/${p.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{p.name}</span>
                          {(alertsByProperty[p.id]?.length > 0) && (
                            <span className="flex items-center gap-1 text-xs">
                              {alertsByProperty[p.id].some(a => a.level === 'overdue') ? (
                                <Badge variant="destructive" className="text-xs px-1.5 py-0">
                                  <AlertCircle className="h-3 w-3 mr-0.5" />
                                  {alertsByProperty[p.id].length}
                                </Badge>
                              ) : (
                                <Badge variant="warning" className="text-xs px-1.5 py-0">
                                  {alertsByProperty[p.id].length}
                                </Badge>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground sm:hidden">{TYPE_LABELS[p.type]}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary">{TYPE_LABELS[p.type]}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {p.address}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'available' ? 'success' : 'warning'}>
                          {p.status === 'available' ? 'Available' : 'Occupied'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(p.rentAmount)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/properties/${p.id}`)}>
                              <Eye className="mr-2 h-3.5 w-3.5" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(p) }}>
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
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
      </div>

      <PropertyFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { if (!saving) { setDialogOpen(open); if (!open) setEditing(null); }}}
        property={editing}
        onSave={handleSave}
        saving={saving}
      />
    </AppLayout>
  )
}
