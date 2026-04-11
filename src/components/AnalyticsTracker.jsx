import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { logPageView } from '@/services/analytics'

/**
 * Lightweight analytics tracker — logs page views on route changes.
 * Renders nothing. Place inside a Router context.
 */
export default function AnalyticsTracker() {
  const location = useLocation()
  const { currentUser, userProfile } = useAuth()
  const lastPath = useRef(null)

  useEffect(() => {
    if (!currentUser?.uid) return
    // Avoid duplicate logs for the same path
    if (location.pathname === lastPath.current) return
    lastPath.current = location.pathname

    logPageView(currentUser.uid, userProfile?.role, location.pathname)
  }, [location.pathname, currentUser?.uid])

  return null
}
