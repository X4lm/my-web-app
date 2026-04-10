import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { getMaintenanceAlerts } from '@/lib/maintenanceConfig'

// Loads all properties + their maintenance data and computes alerts
export function usePropertyAlerts() {
  const { currentUser } = useAuth()
  const [properties, setProperties] = useState([])
  const [alertsByProperty, setAlertsByProperty] = useState({})
  const [allAlerts, setAllAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return

    const q = query(
      collection(db, 'users', currentUser.uid, 'properties'),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(q, async (snap) => {
      const props = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setProperties(props)

      // Load maintenance data for each property
      const alertsMap = {}
      const allAlertsList = []

      await Promise.all(props.map(async (p) => {
        try {
          const mainSnap = await getDoc(
            doc(db, 'users', currentUser.uid, 'properties', p.id, 'maintenance', 'data')
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

      // Also check insurance/permit expiry dates on the property itself
      for (const p of props) {
        const propAlerts = []
        const now = new Date()
        const thirtyDays = 30 * 24 * 60 * 60 * 1000

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

      setAlertsByProperty(alertsMap)
      setAllAlerts(allAlertsList)
      setLoading(false)
    }, (err) => {
      console.error('[Alerts] Listen error:', err)
      setLoading(false)
    })

    return unsub
  }, [currentUser])

  return { properties, alertsByProperty, allAlerts, loading }
}
