import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/AppLayout'
import UnitsTab from '@/components/UnitsTab'
import MaintenanceTab from '@/components/MaintenanceTab'
import FinancialsTab from '@/components/FinancialsTab'
import PropertyFormDialog from '@/components/PropertyFormDialog'
import { lazy, Suspense } from 'react'

const Building3DViewer = lazy(() => import('@/components/Building3DViewer'))
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Building2, MapPin, Calendar, Ruler, DollarSign, FileText, Shield, Landmark, Box, Pencil } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const TYPE_LABELS = {
  villa: 'Villa', townhouse: 'Townhouse', apartment: 'Apartment',
  residential_building: 'Residential Building', commercial: 'Commercial',
}

export default function PropertyDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { currentUser } = useAuth()
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
        console.error('[Firestore] Property detail error:', err)
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
      await updateDoc(doc(db, 'users', currentUser.uid, 'properties', id), {
        ...data, updatedAt: serverTimestamp(),
      })
      setEditOpen(false)
    } catch (err) {
      console.error('[Firestore] Update error:', err.code, err.message)
    } finally {
      setEditSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <p className="text-sm text-muted-foreground py-12 text-center">Loading property...</p>
      </AppLayout>
    )
  }

  if (!property) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <h2 className="text-lg font-semibold">Property not found</h2>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/properties')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Properties
          </Button>
        </div>
      </AppLayout>
    )
  }

  const isBuilding = property.type === 'residential_building'
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
              <Badge variant="secondary">{TYPE_LABELS[property.type] || property.type}</Badge>
              <Badge variant={property.status === 'available' ? 'success' : 'warning'}>
                {property.status === 'available' ? 'Available' : 'Occupied'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {property.address}
            </p>
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
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {isBuilding && <TabsTrigger value="units">Units</TabsTrigger>}
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              {isBuilding && <TabsTrigger value="3d-model">3D Model</TabsTrigger>}
            </TabsList>
          </div>

          <TabsContent value="overview">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Quick stats */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Rent</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">${Number(property.rentAmount || 0).toLocaleString()}</div>
                </CardContent>
              </Card>

              {property.totalArea && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Area</CardTitle>
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{Number(property.totalArea).toLocaleString()} sqm</div>
                  </CardContent>
                </Card>
              )}

              {property.marketValue && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Market Value</CardTitle>
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">${Number(property.marketValue).toLocaleString()}</div>
                  </CardContent>
                </Card>
              )}

              {property.yearBuilt && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Year Built</CardTitle>
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
                      <FileText className="w-4 h-4" /> Documents & Permits
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                      <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-3 text-sm">
                    {property.titleDeedNumber && (
                      <div>
                        <p className="text-muted-foreground">Title Deed</p>
                        <p className="font-medium">{property.titleDeedNumber}</p>
                      </div>
                    )}
                    {property.insuranceExpiry && (
                      <div>
                        <p className="text-muted-foreground">Insurance Expiry</p>
                        <p className={`font-medium ${new Date(property.insuranceExpiry) < new Date() ? 'text-destructive' : ''}`}>{formatDate(property.insuranceExpiry)}</p>
                      </div>
                    )}
                    {property.municipalityPermitExpiry && (
                      <div>
                        <p className="text-muted-foreground">Municipality Permit Expiry</p>
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
                  <CardTitle className="text-base">2D Floor Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <img src={property.floorPlan} alt="Floor Plan" className="rounded-md max-h-96 object-contain" />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {isBuilding && (
            <TabsContent value="units">
              <UnitsTab propertyId={id} />
            </TabsContent>
          )}

          <TabsContent value="maintenance">
            <MaintenanceTab propertyId={id} section={sectionFromUrl} />
          </TabsContent>

          <TabsContent value="financials">
            <FinancialsTab propertyId={id} property={property} />
          </TabsContent>

          {isBuilding && (
            <TabsContent value="3d-model">
              <Suspense fallback={<p className="text-sm text-muted-foreground py-12 text-center">Loading 3D viewer...</p>}>
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
