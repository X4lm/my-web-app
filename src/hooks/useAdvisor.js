import { useCallback, useEffect, useRef, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db, functions } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { logError } from '@/utils/logger'

/**
 * useAdvisor(chatId?)
 *
 * Wraps the askAdvisor Cloud Function + subscribes to the current chat's
 * messages so the UI sees both what the user sent and what the agent
 * (now including tool-backed responses) wrote.
 *
 * - Pass a stable chatId to continue a conversation; pass undefined to
 *   start a new one (the server generates + returns one).
 */
export function useAdvisor(chatId) {
  const { currentUser } = useAuth()
  const { settings } = useLocale()
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [activeChatId, setActiveChatId] = useState(chatId || null)
  const [error, setError] = useState(null)
  const callable = useRef(httpsCallable(functions, 'askAdvisor'))

  // Subscribe to the chat's message subcollection (read-only — writes happen
  // server-side via the Cloud Function).
  useEffect(() => {
    if (!currentUser?.uid || !activeChatId) { setMessages([]); return }
    const q = query(
      collection(db, 'users', currentUser.uid, 'advisorChats', activeChatId, 'messages'),
      orderBy('createdAt', 'asc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, (err) => {
      logError('[Advisor] Snapshot error:', err)
    })
    return unsub
  }, [currentUser?.uid, activeChatId])

  const send = useCallback(async (userMessage) => {
    if (!userMessage?.trim()) return
    if (!currentUser?.uid) { setError('Not signed in.'); return }
    setSending(true)
    setError(null)
    try {
      // Short history: last 10 messages already rendered, minus the just-typed
      // one. We pass role+content only; the server appends retrieved docs.
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }))
      const result = await callable.current({
        message: userMessage,
        chatId: activeChatId || undefined,
        history,
        language: settings.language === 'ar' ? 'ar' : 'en',
      })
      const data = result.data
      if (data?.chatId && data.chatId !== activeChatId) {
        setActiveChatId(data.chatId)
      }
      return data
    } catch (err) {
      logError('[Advisor] Send error:', err)
      setError(err.message || 'Advisor request failed.')
    } finally {
      setSending(false)
    }
  }, [currentUser?.uid, activeChatId, messages, settings.language])

  const startNewChat = useCallback(() => {
    setActiveChatId(null)
    setMessages([])
    setError(null)
  }, [])

  return {
    chatId: activeChatId,
    messages,
    sending,
    error,
    send,
    startNewChat,
  }
}
