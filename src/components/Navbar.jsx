import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const initials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : currentUser?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <nav className={styles.navbar}>
      <div className={styles.brand}>
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#4F46E5"/>
          <path d="M8 24V14l8-6 8 6v10H20v-6h-4v6H8z" fill="white"/>
        </svg>
        <span>PropManager</span>
      </div>

      <div className={styles.userArea}>
        <button className={styles.avatar} onClick={() => setMenuOpen(o => !o)}>
          {initials}
        </button>
        {menuOpen && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownHeader}>
              <div className={styles.dropdownName}>{currentUser?.displayName || 'User'}</div>
              <div className={styles.dropdownEmail}>{currentUser?.email}</div>
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign out
            </button>
          </div>
        )}
        {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)} />}
      </div>
    </nav>
  )
}
