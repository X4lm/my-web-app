import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, X, Loader2 } from 'lucide-react'
import { useAuth, ROLES } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { logError } from '@/utils/logger'
import { Button } from '@/components/ui/button'
import {
  listenToMyThread,
  listenToMessages,
  sendUserMessage,
  markReadByUser,
} from '@/services/supportChat'

export default function ChatWithDev() {
  const { currentUser, userProfile } = useAuth()
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [thread, setThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const wrapperRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Admin is the developer — they don't message themselves.
  const isAdmin = userProfile?.role === ROLES.ADMIN

  // Subscribe to thread metadata (for unread badge)
  useEffect(() => {
    if (!currentUser || isAdmin) return
    const unsub = listenToMyThread(currentUser.uid, setThread)
    return unsub
  }, [currentUser?.uid, isAdmin])

  // Subscribe to messages only while open
  useEffect(() => {
    if (!currentUser || !open) return
    const unsub = listenToMessages(currentUser.uid, setMessages)
    return unsub
  }, [currentUser?.uid, open])

  // Mark read when opened (and whenever new admin msg arrives while open)
  useEffect(() => {
    if (!open || !currentUser) return
    if (thread?.unreadForUser > 0) {
      markReadByUser(currentUser.uid).catch(err => logError('[ChatWithDev] markRead:', err))
    }
  }, [open, thread?.unreadForUser, currentUser?.uid])

  // Scroll to bottom on new messages / open
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, open])

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!currentUser || isAdmin) return null

  const unreadCount = thread?.unreadForUser || 0

  async function handleSend(e) {
    e?.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    try {
      await sendUserMessage({
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        role: userProfile?.role,
        text: draft,
      })
      setDraft('')
    } catch (err) {
      logError('[ChatWithDev] send error:', err)
    } finally {
      setSending(false)
    }
  }

  function formatTime(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Icon button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(v => !v)}
        className="h-8 w-8 relative"
        aria-label={t('chat.withDev')}
        title={t('chat.withDev')}
      >
        <MessageCircle className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-semibold text-white flex items-center justify-center ring-2 ring-background">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Slide-down chat window */}
      {open && (
        <div
          className="absolute end-0 top-[calc(100%+8px)] z-50 w-[min(360px,calc(100vw-1rem))] origin-top-right animate-in slide-in-from-top-2 fade-in duration-200"
        >
          <div className="bg-popover text-popover-foreground border rounded-lg shadow-xl overflow-hidden flex flex-col h-[70vh] max-h-[520px]">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-emerald-600 text-white">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">{t('chat.withDev')}</p>
                  <p className="text-[11px] text-white/80 leading-tight">{t('chat.typicalReply')}</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-white/10"
                aria-label={t('common.cancel')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-muted/30">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 gap-2">
                  <MessageCircle className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium">{t('chat.emptyTitle')}</p>
                  <p className="text-xs text-muted-foreground">{t('chat.emptyDesc')}</p>
                </div>
              ) : (
                messages.map(m => {
                  const mine = m.from === 'user'
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                          mine
                            ? 'bg-emerald-600 text-white rounded-br-sm'
                            : 'bg-background border rounded-bl-sm'
                        }`}
                      >
                        <p>{m.text}</p>
                        <p className={`text-[10px] mt-0.5 ${mine ? 'text-white/70' : 'text-muted-foreground'} text-end`}>
                          {formatTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex items-center gap-2 p-2 border-t bg-background">
              <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder={t('chat.typeMessage')}
                maxLength={2000}
                className="flex-1 h-9 rounded-full bg-muted px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={sending}
              />
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                disabled={!draft.trim() || sending}
                aria-label={t('chat.send')}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
