import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { diffFields, TYPE_LABELS } from '@/lib/utils'
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
import { usePortfolioAggregates } from '@/hooks/usePortfolioAggregates'
import { computeHealthScore } from '@/utils/visibility'
import PropertyHealthBadge from '@/components/PropertyHealthBadge'
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Building2, Eye, AlertCircle } from 'lucide-react'


import { canEdit, FEATURES } from '@/utils/permissions'
import { upsertPropertyIndex } from '@/services/propertyIndex'

const OWNER_ROLES = new Set(['admin', 'owner'])

export default function Properties() {
  const { currentUser, userProfile } = useAuth()
  const { t, formatCurrency } = useLocale()
  const role = userProfile?.role || 'owner'
  const isOwnerRole = OWNER_ROLES.has(role)
  const [ownProperties, setOwnProperties] = useState([])
  const [ownLoading, setOwnLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  // usePropertyAlerts handles linked-property lookup for non-owner roles via propertyIndex.
  const { properties: alertsProperties, alertsByProperty, loading: alertsLoading } = usePropertyAlerts()

  // For owner/admin, keep the real-time onSnapshot so adds/edits reflect instantly.
  // For PM/staff/etc, use usePropertyAlerts (which walks through propertyIndex).
  const properties = isOwnerRole ? ownProperties : alertsProperties
  const loading = isOwnerRole ? ownLoading : alertsLoading
  const { units: allUnits, cheques: allCheques, documents: allDocs } = usePortfolioAggregates(properties)

  useEffect(() => {
    if (!isOwnerRole) {
      setOwnLoading(false)
      return
    }
    const q = query(
      collection(db, 'users', currentUser.uid, 'properties'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setOwnProperties(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setOwnLoading(false)
    }, () => {
      setOwnLoading(false)
    })
    return unsub
  }, [currentUser.uid, isOwnerRole])

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
        const changes = diffFields(editing, data, fieldLabels)
        await updateDoc(doc(db, 'users', currentUser.uid, 'properties', editing.id), {
          ...data, updatedAt: serverTimestamp(), updatedBy: authorName,
        })
        await upsertPropertyIndex(currentUser.uid, editing.id, data.name)
        await addDoc(collection(db, 'users', currentUser.uid, 'properties', editing.id, 'logs'), {
          action: 'property_updated',
          author: authorName,
          details: changes.length > 0 ? `Changed ${changes.map(c => c.field).join(', ')}` : 'Property details updated',
          changes,
          timestamp: serverTimestamp(),
        })
      } else {
        const newDoc = await addDoc(col, { ...data, createdAt: serverTimestamp(), createdBy: authorName })
        await upsertPropertyIndex(currentUser.uid, newDoc.id, data.name)
        await addDoc(collection(db, 'users', currentUser.uid, 'properties', newDoc.id, 'logs'), {
          action: 'property_created',
          author: authorName,
          details: `Created property: ${data.name}`,
          timestamp: serverTimestamp(),
        })
      }
      setDialogOpen(false)
      setEditing(null)
    } catch {
      // silently handle
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(t('properties.deleteConfirm'))) return
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'properties', id))
    } catch {
      // silently handle
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
            <h1 className="text-2xl font-semibold tracking-tight">{t('properties.title')}</h1>
            <p className="text-muted-foreground text-sm">
              {t('properties.subtitle')}
            </p>
          </div>
          {canEdit(role, FEATURES.ADD_PROPERTY) && (
            <Button onClick={openAdd} size="sm">
              <Plus className="w-4 h-4" />
              {t('properties.addProperty')}
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('properties.search')}
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
                  <option value="all">{t('properties.allStatus')}</option>
                  <option value="available">{t('common.available')}</option>
                  <option value="occupied">{t('common.occupied')}</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">{t('properties.allTypes')}</option>
                  {Object.entries(TYPE_LABELS).map(([val]) => (
                    <option key={val} value={val}>{t(`type.${val}`)}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-sm text-muted-foreground py-12 text-center">{t('properties.loadingProperties')}</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <h3 className="text-sm font-medium">
                  {properties.length === 0 ? t('properties.noProperties') : t('properties.noResults')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {properties.length === 0
                    ? t('properties.addFirst')
                    : t('properties.adjustFilters')}
                </p>
                {properties.length === 0 && canEdit(role, FEATURES.ADD_PROPERTY) && (
                  <Button onClick={openAdd} size="sm" className="mt-4">
                    <Plus className="w-4 h-4" />
                    {t('properties.addProperty')}
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">{t('health.title')}</TableHead>
                    <TableHead>{t('properties.property')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('common.type')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('common.address')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="text-right">{t('common.rent')}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => {
                    const pUnits = allUnits.filter(u => u.propertyId === p.id)
                    const pCheques = allCheques.filter(c => c.propertyId === p.id)
                    const pDocs = allDocs.filter(d => d.propertyId === p.id)
                    const pAlerts = alertsByProperty[p.id] || []
                    const health = computeHealthScore({ property: p, units: pUnits, alerts: pAlerts, cheques: pCheques, documents: pDocs })
                    return (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/properties/${p.id}`)}>
                      <TableCell>
                        <PropertyHealthBadge score={health.score} grade={health.grade} tone={health.tone} size="sm" />
                      </TableCell>
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
                        <div className="text-xs text-muted-foreground sm:hidden">{t(`type.${p.type}`)}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary">{t(`type.${p.type}`)}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {p.address}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'available' ? 'success' : 'warning'}>
                          {p.status === 'available' ? t('common.available') : t('common.occupied')}
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
                              {t('common.view')}
                            </DropdownMenuItem>
                            {canEdit(role, FEATURES.EDIT_PROPERTY) && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(p) }}>
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                {t('common.edit')}
                              </DropdownMenuItem>
                            )}
                            {canEdit(role, FEATURES.DELETE_PROPERTY) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  {t('common.delete')}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )})}
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
