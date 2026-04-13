import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { logError } from '@/utils/logger'
import { useAuth } from '@/contexts/AuthContext'
import { getMaintenanceAlerts } from '@/lib/maintenanceConfig'
import { hasUnits } from '@/lib/utils'
import { lookupPropertyOwner } from '@/services/propertyIndex'

// Roles that own their own data (load from users/{uid}/properties)
const OWNER_ROLES = new Set(['admin', 'owner'])

// Loads all properties + their maintenance data and computes alerts
// For owners: reads from their own path
// For PMs/staff: reads from the property owner's path via propertyIndex
export function usePropertyAlerts() {
  const { currentUser, userProfile } = useAuth()
  const [properties, setProperties] = useState([])
  const [alertsByProperty, setAlertsByProperty] = useState({})
  const [allAlerts, setAllAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  const role = userProfile?.role || 'owner'
  const isOwnerRole = OWNER_ROLES.has(role)
  const linkedProperties = userProfile?.linkedProperties || []

  useEffect(() => {
    if (!currentUser) return

    // ─── Owner path: real-time listener on own properties ───────────────
    if (isOwnerRole) {
      const q = query(
        collection(db, 'users', currentUser.uid, 'properties'),
        orderBy('createdAt', 'desc')
      )

      const unsub = onSnapshot(q, async (snap) => {
        const props = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setProperties(props)
        await computeAlerts(props, currentUser.uid)
        setLoading(false)
      }, (err) => {
        logError('[Alerts] Listen error:', err)
        setLoading(false)
      })

      return unsub
    }

    // ─── Non-owner path: load linked properties via propertyIndex ───────
    if (linkedProperties.length === 0) {
      setProperties([])
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadLinkedProperties() {
      try {
        const results = []

        for (const propId of linkedProperties) {
          const ownerInfo = await lookupPropertyOwner(propId)
          if (!ownerInfo?.ownerUid) continue

          const propRef = doc(db, 'users', ownerInfo.ownerUid, 'properties', propId)
          const propSnap = await getDoc(propRef)
          if (propSnap.exists()) {
            results.push({
              id: propSnap.id,
              ...propSnap.data(),
              _ownerUid: ownerInfo.ownerUid, // Track owner for subcollection access
            })
          }
        }

        if (cancelled) return

        setProperties(results)

        // Use the first property's owner for alert computation
        // (In most cases all linked properties belong to the same owner)
        if (results.length > 0) {
          const ownerUid = results[0]._ownerUid
          await computeAlerts(results, ownerUid)
        }

        setLoading(false)
      } catch (err) {
        logError('[Alerts] Load linked properties error:', err)
        if (!cancelled) setLoading(false)
      }
    }

    loadLinkedProperties()

    return () => { cancelled = true }
  }, [currentUser, isOwnerRole, linkedProperties.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Compute alerts for a set of properties ─────────────────────────────
  async function computeAlerts(props, ownerUid) {
    const alertsMap = {}
    const allAlertsList = []
    const now = new Date()

    // Maintenance alerts
    await Promise.all(props.map(async (p) => {
      try {
        const uid = p._ownerUid || ownerUid
        const mainSnap = await getDoc(
          doc(db, 'users', uid, 'properties', p.id, 'maintenance', 'data')
        )
        if (mainSnap.exists()) {
          const alerts = getMaintenanceAlerts(mainSnap.data())
          const enriched = alerts.map(a => ({ ...a, propertyId: p.id, propertyName: p.name }))
          alertsMap[p.id] = enriched
          allAlertsList.push(...enriched)
        } else {
          alertsMap[p.id] = []
        }
      } catch {
        alertsMap[p.id] = []
      }
    }))

    // Insurance/permit expiry
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    for (const p of props) {
      const propAlerts = []
      if (p.insuranceExpiry) {
        const d = new Date(p.insuranceExpiry)
        const diff = d.getTime() - now.getTime()
        if (diff < 0) {
          propAlerts.push({ level: 'overdue', section: 'Property', field: 'Insurance expiry', date: p.insuranceExpiry, sectionKey: 'property', propertyId: p.id, propertyName: p.name })
        } else if (diff < thirtyDays) {
          propAlerts.push({ level: 'upcoming', section: 'Property', field: 'Insurance expiry', date: p.insuranceExpiry, sectionKey: 'property', propertyId: p.id, propertyName: p.name })
        }
      }
      if (p.municipalityPermitExpiry) {
        const d = new Date(p.municipalityPermitExpiry)
        const diff = d.getTime() - now.getTime()
        if (diff < 0) {
          propAlerts.push({ level: 'overdue', section: 'Property', field: 'Municipality permit expiry', date: p.municipalityPermitExpiry, sectionKey: 'property', propertyId: p.id, propertyName: p.name })
        } else if (diff < thirtyDays) {
          propAlerts.push({ level: 'upcoming', section: 'Property', field: 'Municipality permit expiry', date: p.municipalityPermitExpiry, sectionKey: 'property', propertyId: p.id, propertyName: p.name })
        }
      }
      if (propAlerts.length) {
        alertsMap[p.id] = [...(alertsMap[p.id] || []), ...propAlerts]
        allAlertsList.push(...propAlerts)
      }
    }

    // Lease expiry for units
    const sixtyDays = 60 * 24 * 60 * 60 * 1000
    await Promise.all(props.filter(p => hasUnits(p.type)).map(async (p) => {
      try {
        const uid = p._ownerUid || ownerUid
        const unitsSnap = await getDocs(collection(db, 'users', uid, 'properties', p.id, 'units'))
        const leaseAlerts = []
        unitsSnap.docs.forEach(d => {
          const u = d.data()
          if (!u.leaseEnd || !u.tenantName) return
          const end = new Date(u.leaseEnd)
          const diff = end.getTime() - now.getTime()
          if (diff < 0) {
            leaseAlerts.push({ level: 'overdue', section: 'Lease', field: `Unit ${u.unitNumber} — ${u.tenantName}`, date: u.leaseEnd, sectionKey: 'units', propertyId: p.id, propertyName: p.name })
          } else if (diff < sixtyDays) {
            leaseAlerts.push({ level: 'upcoming', section: 'Lease', field: `Unit ${u.unitNumber} — ${u.tenantName}`, date: u.leaseEnd, sectionKey: 'units', propertyId: p.id, propertyName: p.name })
          }
        })
        if (leaseAlerts.length) {
          alertsMap[p.id] = [...(alertsMap[p.id] || []), ...leaseAlerts]
          allAlertsList.push(...leaseAlerts)
        }
      } catch { /* ignore */ }
    }))

    setAlertsByProperty(alertsMap)
    setAllAlerts(allAlertsList)
  }

  return { properties, alertsByProperty, allAlerts, loading }
}
