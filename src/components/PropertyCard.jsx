import styles from './PropertyCard.module.css'

const TYPE_LABELS = {
  apartment: 'Apartment',
  villa: 'Villa',
  commercial: 'Commercial',
}

const TYPE_ICONS = {
  apartment: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/>
      <line x1="15" y1="9" x2="15" y2="21"/>
    </svg>
  ),
  villa: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 21h18M3 10h18M5 10V21M19 10V21M12 3L2 10h20L12 3z"/>
    </svg>
  ),
  commercial: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="7" width="20" height="14" rx="1"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="16"/>
    </svg>
  ),
}

export default function PropertyCard({ property, onEdit, onDelete }) {
  const { name, address, type, rentAmount, status } = property

  function handleDelete() {
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      onDelete(property.id)
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={`${styles.typeIcon} ${styles[type]}`}>
          {TYPE_ICONS[type]}
        </div>
        <span className={`${styles.statusBadge} ${styles[status]}`}>
          {status === 'available' ? 'Available' : 'Occupied'}
        </span>
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.propertyName}>{name}</h3>
        <p className={styles.address}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          {address}
        </p>
        <div className={styles.typeLabel}>{TYPE_LABELS[type]}</div>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.rent}>
          <span className={styles.rentAmount}>${Number(rentAmount).toLocaleString()}</span>
          <span className={styles.rentPer}>/month</span>
        </div>
        <div className={styles.actions}>
          <button className={styles.editBtn} onClick={() => onEdit(property)} title="Edit">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
          <button className={styles.deleteBtn} onClick={handleDelete} title="Delete">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
