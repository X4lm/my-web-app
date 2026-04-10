import { useState, useEffect, useRef, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Html } from '@react-three/drei'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Box, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Color helpers ──
function getUnitColor(unit) {
  if (!unit) return '#6b7280' // empty/unknown → gray
  if (unit.condition === 'critical') return '#ef4444' // red
  if (unit.condition === 'needs_attention') return '#f59e0b' // amber
  if (unit.paymentStatus === 'overdue') return '#ef4444'
  if (unit.paymentStatus === 'pending') return '#f59e0b'
  if (unit.tenantName && unit.tenantName.trim()) return '#22c55e' // occupied → green
  return '#3b82f6' // vacant → blue
}

function getUnitLabel(unit) {
  if (!unit) return 'Empty'
  if (unit.condition === 'critical') return 'Critical'
  if (unit.condition === 'needs_attention') return 'Needs Attention'
  if (unit.paymentStatus === 'overdue') return 'Overdue'
  if (unit.paymentStatus === 'pending') return 'Pending'
  if (unit.tenantName && unit.tenantName.trim()) return 'Occupied'
  return 'Vacant'
}

// ── 3D Unit Box ──
function UnitBox({ position, size, unit, onClick, isSelected }) {
  const [hovered, setHovered] = useState(false)
  const color = getUnitColor(unit)

  return (
    <group position={position}>
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); onClick(unit) }}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={hovered || isSelected ? '#ffffff' : color}
          emissive={color}
          emissiveIntensity={hovered || isSelected ? 0.6 : 0.3}
          transparent
          opacity={hovered ? 0.95 : 0.85}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      {/* Wireframe overlay */}
      <mesh>
        <boxGeometry args={size} />
        <meshBasicMaterial color="#000000" wireframe transparent opacity={0.15} />
      </mesh>
      {/* Unit number label */}
      <Text
        position={[0, 0, size[2] / 2 + 0.01]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {unit?.unitNumber || '?'}
      </Text>
      {/* Hover popup */}
      {hovered && unit && (
        <Html position={[0, size[1] / 2 + 0.3, 0]} center>
          <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 min-w-[180px] pointer-events-none">
            <p className="font-semibold text-sm">Unit {unit.unitNumber}</p>
            {unit.floor && <p className="text-xs text-muted-foreground">Floor {unit.floor}</p>}
            <div className="mt-1.5 space-y-0.5 text-xs">
              {unit.tenantName && <p>Tenant: {unit.tenantName}</p>}
              {unit.monthlyRent && <p>Rent: ${Number(unit.monthlyRent).toLocaleString()}</p>}
              <p>Status: {getUnitLabel(unit)}</p>
              {unit.condition && <p>Condition: {unit.condition.replace('_', ' ')}</p>}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

// ── Floor plate ──
function FloorPlate({ position, size }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#94a3b8" transparent opacity={0.15} />
    </mesh>
  )
}

// ── Ground plane ──
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#1e293b" transparent opacity={0.3} />
    </mesh>
  )
}

// ── Building group ──
function BuildingModel({ units, selectedUnit, onSelectUnit }) {
  // Group units by floor
  const floors = useMemo(() => {
    const map = {}
    units.forEach(u => {
      const f = Number(u.floor) || 1
      if (!map[f]) map[f] = []
      map[f].push(u)
    })
    return map
  }, [units])

  const floorNumbers = Object.keys(floors).map(Number).sort((a, b) => a - b)
  const maxUnitsPerFloor = Math.max(...Object.values(floors).map(f => f.length), 1)

  const unitWidth = 1.2
  const unitHeight = 0.9
  const unitDepth = 1.0
  const gap = 0.1
  const floorGap = 0.15

  return (
    <group>
      <Ground />
      {floorNumbers.map((floorNum, floorIdx) => {
        const floorUnits = floors[floorNum]
        const y = floorIdx * (unitHeight + floorGap)
        const totalWidth = floorUnits.length * (unitWidth + gap) - gap

        return (
          <group key={floorNum}>
            {/* Floor slab */}
            <FloorPlate
              position={[0, y - unitHeight / 2 - 0.05, 0]}
              size={[Math.max(totalWidth + 0.4, maxUnitsPerFloor * (unitWidth + gap)), 0.08, unitDepth + 0.4]}
            />
            {/* Units on this floor */}
            {floorUnits.map((unit, unitIdx) => {
              const x = (unitIdx - (floorUnits.length - 1) / 2) * (unitWidth + gap)
              return (
                <UnitBox
                  key={unit.id}
                  position={[x, y, 0]}
                  size={[unitWidth, unitHeight, unitDepth]}
                  unit={unit}
                  isSelected={selectedUnit?.id === unit.id}
                  onClick={onSelectUnit}
                />
              )
            })}
            {/* Floor label */}
            <Text
              position={[-(maxUnitsPerFloor * (unitWidth + gap)) / 2 - 0.5, y, 0]}
              fontSize={0.22}
              color="#94a3b8"
              anchorX="right"
              anchorY="middle"
            >
              {`F${floorNum}`}
            </Text>
          </group>
        )
      })}
    </group>
  )
}

// ── Camera reset helper ──
function CameraController({ controlsRef }) {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(5, 4, 6)
    camera.lookAt(0, 1, 0)
  }, [camera])

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      enableRotate
      minDistance={3}
      maxDistance={20}
      target={[0, 1, 0]}
    />
  )
}

// ── Main component ──
export default function Building3DViewer({ propertyId, property }) {
  const { currentUser } = useAuth()
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUnit, setSelectedUnit] = useState(null)
  const controlsRef = useRef()

  useEffect(() => {
    const q = query(collection(db, 'users', currentUser.uid, 'properties', propertyId, 'units'))
    const unsub = onSnapshot(q, (snap) => {
      setUnits(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [currentUser.uid, propertyId])

  function resetCamera() {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">Loading 3D model...</p>
        </CardContent>
      </Card>
    )
  }

  if (units.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Box className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-sm font-medium">No units to display</h3>
          <p className="text-sm text-muted-foreground mt-1">Add units in the Units tab to see the 3D model.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Box className="w-4 h-4" /> 3D Building Model
            </CardTitle>
            <Button variant="outline" size="sm" onClick={resetCamera}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset View
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[450px] w-full rounded-b-lg overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800">
            <Canvas
              camera={{ position: [5, 4, 6], fov: 50 }}
              dpr={[1, 2]}
            >
              <ambientLight intensity={0.5} />
              <directionalLight position={[5, 8, 5]} intensity={0.8} />
              <directionalLight position={[-3, 4, -3]} intensity={0.3} />
              <CameraController controlsRef={controlsRef} />
              <BuildingModel
                units={units}
                selectedUnit={selectedUnit}
                onSelectUnit={setSelectedUnit}
              />
            </Canvas>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
              <span className="text-muted-foreground">Vacant</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#22c55e' }} />
              <span className="text-muted-foreground">Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
              <span className="text-muted-foreground">Pending / Needs Attention</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
              <span className="text-muted-foreground">Overdue / Critical</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected unit detail */}
      {/* Floor plan reference */}
      {property?.floorPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2D Floor Plan Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <img src={property.floorPlan} alt="Floor Plan" className="rounded-md max-h-80 w-full object-contain" />
          </CardContent>
        </Card>
      )}

      {selectedUnit && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Unit {selectedUnit.unitNumber}</CardTitle>
              <Badge variant={
                selectedUnit.condition === 'critical' ? 'destructive' :
                selectedUnit.condition === 'needs_attention' ? 'warning' : 'success'
              }>
                {getUnitLabel(selectedUnit)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Floor</p>
                <p className="font-medium">{selectedUnit.floor || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium">{selectedUnit.unitType || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tenant</p>
                <p className="font-medium">{selectedUnit.tenantName || 'Vacant'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Monthly Rent</p>
                <p className="font-medium">${Number(selectedUnit.monthlyRent || 0).toLocaleString()}</p>
              </div>
              {selectedUnit.tenantContact && (
                <div>
                  <p className="text-muted-foreground">Contact</p>
                  <p className="font-medium">{selectedUnit.tenantContact}</p>
                </div>
              )}
              {selectedUnit.paymentStatus && (
                <div>
                  <p className="text-muted-foreground">Payment</p>
                  <p className="font-medium capitalize">{selectedUnit.paymentStatus}</p>
                </div>
              )}
              {selectedUnit.size && (
                <div>
                  <p className="text-muted-foreground">Size</p>
                  <p className="font-medium">{selectedUnit.size} sqm</p>
                </div>
              )}
              {selectedUnit.condition && (
                <div>
                  <p className="text-muted-foreground">Condition</p>
                  <p className="font-medium capitalize">{selectedUnit.condition.replace('_', ' ')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
