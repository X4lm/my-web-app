import { useState, useEffect } from 'react'
import styles from './PropertyForm.module.css'

const EMPTY = { name: '', address: '', type: 'apartment', rentAmount: '', status: 'available' }

export default function PropertyForm({ property, onSave, onClose, saving }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setForm(property ? { ...property } : EMPTY)
    setErrors({})
  }, [property])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Property name is required.'
    if (!form.address.trim()) e.address = 'Address is required.'
    if (!form.rentAmount || isNaN(form.rentAmount) || Number(form.rentAmount) <= 0)
      e.rentAmount = 'Enter a valid rent amount.'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) return setErrors(errs)
    onSave({ ...form, rentAmount: Number(form.rentAmount) })
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{property ? 'Edit Property' : 'Add New Property'}</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={saving}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Property Name</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Sunset Apartments Block A"
            />
            {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
          </div>

          <div className={styles.field}>
            <label>Address</label>
            <input
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="e.g. 123 Main St, New York, NY 10001"
            />
            {errors.address && <span className={styles.fieldError}>{errors.address}</span>}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Property Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="apartment">Apartment</option>
                <option value="villa">Villa</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label>Monthly Rent (USD)</label>
            <div className={styles.rentInput}>
              <span className={styles.rentPrefix}>$</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.rentAmount}
                onChange={e => set('rentAmount', e.target.value)}
                placeholder="0"
                className={styles.rentField}
              />
            </div>
            {errors.rentAmount && <span className={styles.fieldError}>{errors.rentAmount}</span>}
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving…' : property ? 'Save Changes' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
