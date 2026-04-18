import { useState, useEffect } from 'react'
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { Megaphone, X } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import { useAuth } from '@/contexts/AuthContext'
import { logError } from '@/utils/logger'

// Stable hash for announcement text → announcementId so a changed message
// counts as a new announcement and re-shows to users who dismissed the prior.
function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return String(h)
}

export default function PlatformAnnouncement() {
  const { t } = useLocale()
  const { currentUser, userProfile } = useAuth()
  const [announcement, setAnnouncement] = useState('')
  const [active, setActive] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'platformSettings', 'general'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setAnnouncement(data.announcement || '')
          setActive(data.announcementActive === true)
        }
      },
      () => {
        // silently handle permission errors
      }
    )
    return unsub
  }, [])

  // Whether the user already dismissed this exact announcement.
  // Firestore is the source of truth (syncs across devices); localStorage is
  // a fallback so anonymous users / offline usage still works.
  useEffect(() => {
    if (!announcement) { setDismissed(false); return }
    const id = hashString(announcement)
    // Check Firestore first
    const remoteList = userProfile?.dismissedAnnouncements || []
    if (remoteList.includes(id)) { setDismissed(true); return }
    // Fallback to localStorage
    try {
      const key = `announce_dismissed_${currentUser?.uid || 'anon'}_${id}`
      setDismissed(localStorage.getItem(key) === '1')
    } catch { setDismissed(false) }
  }, [announcement, currentUser?.uid, userProfile?.dismissedAnnouncements])

  async function handleDismiss() {
    setDismissed(true)
    if (!announcement) return
    const id = hashString(announcement)
    // localStorage for immediate / offline-safe persistence
    try {
      localStorage.setItem(`announce_dismissed_${currentUser?.uid || 'anon'}_${id}`, '1')
    } catch { /* ignore */ }
    // Firestore so it syncs across devices + survives clearing the browser
    if (currentUser?.uid) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          dismissedAnnouncements: arrayUnion(id),
        })
      } catch (err) {
        logError('[Announce] Dismiss persist error:', err)
      }
    }
  }

  if (!active || !announcement || dismissed) return null

  return (
    <div className="relative rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 mb-1">
      <button
        onClick={handleDismiss}
        className="absolute top-2 end-2 p-1 rounded-md hover:bg-amber-500/20 text-amber-600 transition-colors"
        aria-label={t('announce.dismiss')}
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-start gap-3 pe-6">
        <Megaphone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-0.5">
            {t('announce.platformLabel')}
          </p>
          <p className="text-sm text-amber-900/80 dark:text-amber-200/80 whitespace-pre-line">
            {announcement}
          </p>
        </div>
      </div>
    </div>
  )
}
