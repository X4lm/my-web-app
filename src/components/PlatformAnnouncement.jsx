import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { Megaphone, X } from 'lucide-react'

export default function PlatformAnnouncement() {
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

  if (!active || !announcement || dismissed) return null

  return (
    <div className="relative rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 mb-1">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 end-2 p-1 rounded-md hover:bg-amber-500/20 text-amber-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-start gap-3 pe-6">
        <Megaphone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-0.5">
            Announcement
          </p>
          <p className="text-sm text-amber-900/80 dark:text-amber-200/80 whitespace-pre-line">
            {announcement}
          </p>
        </div>
      </div>
    </div>
  )
}
