import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { doc, onSnapshot, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/AppLayout'
import UnitsTab from '@/components/UnitsTab'
import MaintenanceTab from '@/components/MaintenanceTab'
import FinancialsTab from '@/components/FinancialsTab'
import LogsTab from '@/components/LogsTab'
import WorkOrdersTab from '@/components/WorkOrdersTab'
import InspectionTab from '@/components/InspectionTab'
import CommunicationLog from '@/components/CommunicationLog'
import AnnouncementsTab from '@/components/AnnouncementsTab'
import OwnerReportGenerator from '@/components/OwnerReportGenerator'
import DocumentsTab from '@/components/DocumentsTab'
import MoveOutWorkflow from '@/components/MoveOutWorkflow'
import UtilityTracker from '@/components/UtilityTracker'
import BulkOperations from '@/components/BulkOperations'
import TeamTab from '@/components/TeamTab'
import PropertyFormDialog from '@/components/PropertyFormDialog'
import { lazy, Suspense } from 'react'

const Building3DViewer = lazy(() => import('@/components/Building3DViewer'))
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Building2, MapPin, Calendar, Ruler, DollarSign, FileText, Shield, Landmark, Box, Pencil, User, Users, ScrollText, MessageSquare, Megaphone, FileDown, FolderOpen, LogOut, Zap, Layers } from 'lucide-react'
import { diffFields, hasUnits } from '@/lib/utils'
import { useLocale } from '@/contexts/LocaleContext'
import { canAccess, canEdit, FEATURES } from '@/utils/permissions'

export default function PropertyDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { currentUser, userProfile } = useAuth()
  const { t, formatCurrency, formatDate } = useLocale()
  const role = userProfile?.role || 'owner'
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  const tabFromUrl = searchParams.get('tab')
  const sectionFromUrl = searchParams.get('section')

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'users', currentUser.uid, 'properties', id),
      (snap) => {
        if (snap.exists()) {
          setProperty({ id: snap.id, ...snap.data() })
        } else {
          setProperty(null)
        }
        setLoading(false)
      },
      (err) => {
        logError('[Firestore] Property detail error:', err)
        setLoading(false)
      }
    )
    return unsub
  }, [currentUser.uid, id])

  // Scroll to Documents & Permits section when coming from a property-level alert
  useEffect(() => {
    if (!loading && property && sectionFromUrl === 'property') {
      setTimeout(() => {
        const el = document.getElementById('section-documents')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
    }
  }, [loading, property, sectionFromUrl])

  async function handleEditSave(data) {
    setEditSaving(true)
    try {
      const authorName = currentUser.displayName || currentUser.email || 'Unknown'
      const changes = diffFields(property, data, {
        name: 'Name', address: 'Address', type: 'Type', status: 'Status',
        rentAmount: 'Rent Amount', yearBuilt: 'Year Built', totalArea: 'Total Area',
        marketValue: 'Market Value', titleDeedNumber: 'Title Deed',
        insuranceExpiry: 'Insurance Expiry', municipalityPermitExpiry: 'Municipality Permit Expiry',
      })
      await updateDoc(doc(db, 'users', currentUser.uid, 'properties', id), {
        ...data, updatedAt: serverTimestamp(), updatedBy: authorName,
      })
      await addDoc(collection(db, 'users', currentUser.uid, 'properties', id, 'logs'), {
        action: 'property_updated',
        author: authorName,
        details: changes.length > 0 ? `Changed ${changes.map(c => c.field).join(', ')}` : 'Property details updated',
        changes,
        timestamp: serverTimestamp(),
      })
      setEditOpen(false)
    } catch (err) {
      logError('[Firestore] Update error:', err.code, err.message)
    } finally {
      setEditSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <p className="text-sm text-muted-foreground py-12 text-center">{t('property.loading')}</p>
      </AppLayout>
    )
  }

  if (!property) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <h2 className="text-lg font-semibold">{t('property.notFound')}</h2>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/properties')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> {t('property.backToProperties')}
          </Button>
        </div>
      </AppLayout>
    )
  }

  const isBuilding = hasUnits(property.type)
  const defaultTab = tabFromUrl || 'overview'

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/properties')} className="mt-1">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{property.name}</h1>
              <Badge variant="secondary">{t(`type.${property.type}`) || property.type}</Badge>
              <Badge variant={property.status === 'available' ? 'success' : 'warning'}>
                {property.status === 'available' ? t('common.available') : t('common.occupied')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {property.address}
            </p>
            {(property.updatedBy || property.createdBy) && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <User className="w-3 h-3" />
                {t('property.lastEditedBy')} {property.updatedBy || property.createdBy}
                {property.updatedAt && (() => {
                  const d = property.updatedAt?.toDate ? property.updatedAt.toDate() : new Date(property.updatedAt)
                  return ` · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                })()}
              </p>
            )}
          </div>
        </div>

        {/* Cover photo */}
        {property.coverPhoto && (
          <div className="rounded-lg overflow-hidden border">
            <img src={property.coverPhoto} alt={property.name} className="w-full h-48 object-cover" />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue={defaultTab}>
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
              {canAccess(role, FEATURES.TAB_OVERVIEW) && <TabsTrigger value="overview">{t('property.overview')}</TabsTrigger>}
              {isBuilding && canAccess(role, FEATURES.TAB_UNITS) && <TabsTrigger value="units">{t('property.units')}</TabsTrigger>}
              {canAccess(role, FEATURES.TAB_MAINTENANCE) && <TabsTrigger value="maintenance">{t('property.maintenance')}</TabsTrigger>}
              {canAccess(role, FEATURES.TAB_WORK_ORDERS) && <TabsTrigger value="work-orders">{t('property.workOrders')}</TabsTrigger>}
              {canAccess(role, FEATURES.TAB_FINANCIALS) && <TabsTrigger value="financials">{t('property.financials')}</TabsTrigger>}
              {canAccess(role, FEATURES.TAB_INSPECTION) && <TabsTrigger value="inspection">{t('property.inspection')}</TabsTrigger>}
              {canAccess(role, FEATURES.TAB_COMMS) && <TabsTrigger value="comms">{t('property.comms')}</TabsTrigger>}
              {isBuilding && canAccess(role, FEATURES.TAB_ANNOUNCEMENTS) && <TabsTrigger value="announcements">{t('property.announcements')}</TabsTrigger>}
              {canAccess(role, FEATURES.TAB_DOCUMENTS) && <TabsTrigger value="documents">{t('property.documents')}</TabsTrigger>}
              {isBuilding && canAccess(role, FEATURES.TAB_UTILITIES) && <TabsTrigger value="utilities">{t('property.utilities')}</TabsTrigger>}
              {isBuilding && canAccess(role, FEATURES.TAB_MOVE_OUT) && <TabsTrigger value="move-out">{t('property.moveOut')}</TabsTrigger>}
              {isBuilding && canAccess(role, FEATURES.TAB_BULK_OPS) && <TabsTrigger value="bulk">{t('property.bulkOps')}</TabsTrigger>}
              {canAccess(role, FEATURES.TAB_REPORTS) && <TabsTrigger value="reports">{t('property.reports')}</TabsTrigger>}
              {canAccess(role, FEATURES.TAB_TEAM) && <TabsTrigger value="team">{t('team.title')}</TabsTrigger>}
              {canAccess(role, FEATURES.TAB_LOGS) && <TabsTrigger value="logs">{t('property.logs')}</TabsTrigger>}
              {isBuilding && canAccess(role, FEATURES.TAB_3D_MODEL) && <TabsTrigger value="3d-model">{t('property.3dModel')}</TabsTrigger>}
            </TabsList>
          </div>

          <TabsContent value="overview">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Quick stats */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('property.monthlyRent')}</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{formatCurrency(property.rentAmount)}</div>
                </CardContent>
              </Card>

              {property.totalArea && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t('property.totalArea')}</CardTitle>
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{Number(property.totalArea).toLocaleString()} {t('property.sqm')}</div>
                  </CardContent>
                </Card>
              )}

              {property.marketValue && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t('property.marketValue')}</CardTitle>
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{formatCurrency(property.marketValue)}</div>
                  </CardContent>
                </Card>
              )}

              {property.yearBuilt && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t('property.yearBuilt')}</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{property.yearBuilt}</div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Documents section */}
            {(property.titleDeedNumber || property.insuranceExpiry || property.municipalityPermitExpiry) && (
              <Card className={`mt-4 ${sectionFromUrl === 'property' ? 'ring-2 ring-primary' : ''}`} id="section-documents">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" /> {t('property.documentsPermits')}
                    </CardTitle>
                    {canEdit(role, FEATURES.EDIT_PROPERTY) && (
                      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                        <Pencil className="w-3.5 h-3.5 mr-1.5" /> {t('property.edit')}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-3 text-sm">
                    {property.titleDeedNumber && (
                      <div>
                        <p className="text-muted-foreground">{t('property.titleDeed')}</p>
                        <p className="font-medium">{property.titleDeedNumber}</p>
                      </div>
                    )}
                    {property.insuranceExpiry && (
                      <div>
                        <p className="text-muted-foreground">{t('property.insuranceExpiry')}</p>
                        <p className={`font-medium ${new Date(property.insuranceExpiry) < new Date() ? 'text-destructive' : ''}`}>{formatDate(property.insuranceExpiry)}</p>
                      </div>
                    )}
                    {property.municipalityPermitExpiry && (
                      <div>
                        <p className="text-muted-foreground">{t('property.municipalityPermitExpiry')}</p>
                        <p className={`font-medium ${new Date(property.municipalityPermitExpiry) < new Date() ? 'text-destructive' : ''}`}>{formatDate(property.municipalityPermitExpiry)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Floor plan */}
            {property.floorPlan && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">{t('property.floorPlan')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <img src={property.floorPlan} alt={t('property.floorPlan')} className="rounded-md max-h-96 object-contain" />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {isBuilding && (
            <TabsContent value="units">
              <UnitsTab propertyId={id} propertyType={property.type} propertyName={property.name} />
            </TabsContent>
          )}

          <TabsContent value="maintenance">
            <MaintenanceTab propertyId={id} section={sectionFromUrl} />
          </TabsContent>

          <TabsContent value="work-orders">
            <WorkOrdersTab propertyId={id} />
          </TabsContent>

          <TabsContent value="financials">
            <FinancialsTab propertyId={id} property={property} />
          </TabsContent>

          <TabsContent value="inspection">
            <InspectionTab propertyId={id} />
          </TabsContent>

          <TabsContent value="comms">
            <CommunicationLog propertyId={id} />
          </TabsContent>

          {isBuilding && (
            <TabsContent value="announcements">
              <AnnouncementsTab propertyId={id} />
            </TabsContent>
          )}

          <TabsContent value="documents">
            <DocumentsTab propertyId={id} />
          </TabsContent>

          {isBuilding && (
            <TabsContent value="utilities">
              <UtilityTracker propertyId={id} />
            </TabsContent>
          )}

          {isBuilding && (
            <TabsContent value="move-out">
              <MoveOutWorkflow propertyId={id} />
            </TabsContent>
          )}

          {isBuilding && (
            <TabsContent value="bulk">
              <BulkOperations propertyId={id} property={property} />
            </TabsContent>
          )}

          <TabsContent value="reports">
            <OwnerReportGenerator propertyId={id} property={property} />
          </TabsContent>

          <TabsContent value="team">
            <TeamTab propertyId={id} property={property} />
          </TabsContent>

          <TabsContent value="logs">
            <LogsTab propertyId={id} />
          </TabsContent>

          {isBuilding && (
            <TabsContent value="3d-model">
              <Suspense fallback={<p className="text-sm text-muted-foreground py-12 text-center">{t('property.loading3d')}</p>}>
                <Building3DViewer propertyId={id} property={property} />
              </Suspense>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <PropertyFormDialog
        open={editOpen}
        onOpenChange={(open) => { if (!editSaving) setEditOpen(open) }}
        property={property}
        onSave={handleEditSave}
        saving={editSaving}
      />
    </AppLayout>
  )
}
