import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'
import PropertyCard from '../components/PropertyCard'
import PropertyForm from '../components/PropertyForm'
import styles from './Dashboard.module.css'

const FILTERS = ['all', 'available', 'occupied']
const TYPES = ['all', 'apartment', 'villa', 'commercial']

export default function Dashboard() {
  const { currentUser } = useAuth()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState(null)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const q = query(
      collection(db, 'users', currentUser.uid, 'properties'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setProperties(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [currentUser.uid])

  async function handleSave(data) {
    setSaving(true)
    try {
      const col = collection(db, 'users', currentUser.uid, 'properties')
      if (editingProperty) {
        await updateDoc(doc(db, 'users', currentUser.uid, 'properties', editingProperty.id), {
          ...data,
          updatedAt: serverTimestamp(),
        })
      } else {
        await addDoc(col, { ...data, createdAt: serverTimestamp() })
      }
      setShowForm(false)
      setEditingProperty(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'properties', id))
  }

  function openEdit(property) {
    setEditingProperty(property)
    setShowForm(true)
  }

  function openAdd() {
    setEditingProperty(null)
    setShowForm(true)
  }

  function closeForm() {
    if (saving) return
    setShowForm(false)
    setEditingProperty(null)
  }

  const filtered = properties.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (typeFilter !== 'all' && p.type !== typeFilter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.address.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    total: properties.length,
    available: properties.filter(p => p.status === 'available').length,
    occupied: properties.filter(p => p.status === 'occupied').length,
    revenue: properties.filter(p => p.status === 'occupied').reduce((s, p) => s + Number(p.rentAmount), 0),
  }

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <h1>Properties</h1>
            <p>Welcome back, {currentUser?.displayName || 'there'}!</p>
          </div>
          <button className={styles.addBtn} onClick={openAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Property
          </button>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{background:'#ede9fe',color:'#6d28d9'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <div className={styles.statValue}>{stats.total}</div>
              <div className={styles.statLabel}>Total Properties</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{background:'#d1fae5',color:'#065f46'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <div className={styles.statValue}>{stats.available}</div>
              <div className={styles.statLabel}>Available</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{background:'#fee2e2',color:'#991b1b'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div>
              <div className={styles.statValue}>{stats.occupied}</div>
              <div className={styles.statLabel}>Occupied</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{background:'#fef3c7',color:'#92400e'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <div>
              <div className={styles.statValue}>${stats.revenue.toLocaleString()}</div>
              <div className={styles.statLabel}>Monthly Revenue</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name or address…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              {FILTERS.map(f => (
                <button
                  key={f}
                  className={`${styles.filterBtn} ${statusFilter === f ? styles.active : ''}`}
                  onClick={() => setStatusFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <select
              className={styles.typeSelect}
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="apartment">Apartment</option>
              <option value="villa">Villa</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className={styles.emptyState}>
            <div className={styles.spinner} />
            <p>Loading properties…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            {properties.length === 0 ? (
              <>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <h3>No properties yet</h3>
                <p>Get started by adding your first property.</p>
                <button className={styles.addBtn} onClick={openAdd}>Add your first property</button>
              </>
            ) : (
              <>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <h3>No results found</h3>
                <p>Try adjusting your search or filters.</p>
              </>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(p => (
              <PropertyCard key={p.id} property={p} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <PropertyForm
          property={editingProperty}
          onSave={handleSave}
          onClose={closeForm}
          saving={saving}
        />
      )}
    </div>
  )
}
