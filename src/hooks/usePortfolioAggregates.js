/**
 * Loads cheques, expenses, work orders, and documents across ALL of the
 * user's properties. Used by visibility features (Priority Queue, Document
 * Expiry Radar, Atlas, Portfolio widgets, Anomaly detection).
 *
 * Pairs with `usePropertyAlerts` which provides properties + alerts + units
 * (via its internal maintenance/unit fetches). This hook takes `properties`
 * as input (from usePropertyAlerts) so we don't double-fetch.
 */
import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { logError } from '@/utils/logger'

export function usePortfolioAggregates(properties) {
  const { currentUser } = useAuth()
  const [cheques, setCheques] = useState([])
  const [expenses, setExpenses] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [documents, setDocuments] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser || !properties || properties.length === 0) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const allCheques = []
        const allExpenses = []
        const allWO = []
        const allDocs = []
        const allUnits = []

        await Promise.all(properties.map(async (p) => {
          const ownerUid = p._ownerUid || currentUser.uid
          const basePath = ['users', ownerUid, 'properties', p.id]
          const context = { propertyId: p.id, propertyName: p.name }

          const [chq, exp, wo, docs, unts] = await Promise.allSettled([
            getDocs(collection(db, ...basePath, 'cheques')),
            getDocs(collection(db, ...basePath, 'expenses')),
            getDocs(collection(db, ...basePath, 'workOrders')),
            getDocs(collection(db, ...basePath, 'documents')),
            getDocs(collection(db, ...basePath, 'units')),
          ])

          if (chq.status === 'fulfilled') {
            chq.value.docs.forEach(d => allCheques.push({ id: d.id, ...d.data(), ...context }))
          }
          if (exp.status === 'fulfilled') {
            exp.value.docs.forEach(d => allExpenses.push({ id: d.id, ...d.data(), ...context }))
          }
          if (wo.status === 'fulfilled') {
            wo.value.docs.forEach(d => allWO.push({ id: d.id, ...d.data(), ...context }))
          }
          if (docs.status === 'fulfilled') {
            docs.value.docs.forEach(d => allDocs.push({ id: d.id, ...d.data(), ...context }))
          }
          if (unts.status === 'fulfilled') {
            unts.value.docs.forEach(d => allUnits.push({ id: d.id, ...d.data(), ...context }))
          }
        }))

        if (cancelled) return
        setCheques(allCheques)
        setExpenses(allExpenses)
        setWorkOrders(allWO)
        setDocuments(allDocs)
        setUnits(allUnits)
      } catch (err) {
        logError('[usePortfolioAggregates]', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, properties?.map(p => p.id).join(',')])

  return { cheques, expenses, workOrders, documents, units, loading }
}
