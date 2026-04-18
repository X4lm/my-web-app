import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { logError } from '@/utils/logger'
import AppLayout from '@/components/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Send, Loader2, Search, User as UserIcon } from 'lucide-react'
import {
  listenToAllThreads,
  listenToMessages,
  sendAdminMessage,
  markReadByAdmin,
} from '@/services/supportChat'

const ROLE_VARIANT = {
  admin: 'destructive',
  owner: 'default',
  property_manager: 'secondary',
  staff: 'secondary',
  vendor: 'outline',
  tenant: 'outline',
}

export default function AdminSupportChatPage() {
  const { currentUser, userProfile } = useAuth()
  const { t, formatDate } = useLocale()
  const [threads, setThreads] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    const unsub = listenToAllThreads(setThreads)
    return unsub
  }, [])

  useEffect(() => {
    if (!selected) { setMessages([]); return }
    const unsub = listenToMessages(selected.userId, setMessages)
    return unsub
  }, [selected?.userId])

  // Mark thread as read when opened / when it updates
  useEffect(() => {
    if (!selected) return
    if (selected.unreadForAdmin > 0) {
      markReadByAdmin(selected.userId).catch(err => logError('[AdminSupportChat] markRead:', err))
    }
  }, [selected?.userId, selected?.unreadForAdmin])

  // Keep selected thread's metadata fresh from the threads list
  useEffect(() => {
    if (!selected) return
    const updated = threads.find(th => th.userId === selected.userId)
    if (updated && updated.lastMessageAt !== selected.lastMessageAt) {
      setSelected(updated)
    }
  }, [threads, selected?.userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  async function handleSend(e) {
    e?.preventDefault()
    if (!draft.trim() || !selected || sending) return
    setSending(true)
    try {
      await sendAdminMessage({
        userId: selected.userId,
        adminUid: currentUser.uid,
        adminName: userProfile?.displayName || currentUser.displayName || 'Support',
        text: draft,
      })
      setDraft('')
    } catch (err) {
      logError('[AdminSupportChat] send error:', err)
    } finally {
      setSending(false)
    }
  }

  function formatTime(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function formatRelative(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    const diffMs = Date.now() - d.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return t('chat.justNow')
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d`
    return formatDate(d.toISOString().slice(0, 10))
  }

  const filtered = threads.filter(th => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (th.userName || '').toLowerCase().includes(q) ||
      (th.userEmail || '').toLowerCase().includes(q) ||
      (th.lastMessage || '').toLowerCase().includes(q)
    )
  })

  const totalUnread = threads.reduce((sum, th) => sum + (th.unreadForAdmin || 0), 0)

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            {t('chat.adminTitle')}
            {totalUnread > 0 && (
              <Badge variant="destructive" className="text-xs">{totalUnread} {t('chat.unread')}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">{t('chat.adminSubtitle')}</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-[70vh] min-h-[520px]">
              {/* Thread list */}
              <div className="border-e flex flex-col min-h-0">
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder={t('common.search')}
                      className="w-full h-9 ps-9 pe-3 rounded-md bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      {t('chat.noThreads')}
                    </div>
                  ) : (
                    filtered.map(th => {
                      const isActive = selected?.userId === th.userId
                      const unread = th.unreadForAdmin || 0
                      return (
                        <button
                          key={th.userId}
                          onClick={() => setSelected(th)}
                          className={`w-full text-start px-3 py-3 border-b hover:bg-muted/50 transition-colors flex items-start gap-3 ${
                            isActive ? 'bg-muted' : ''
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <UserIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className={`text-sm truncate ${unread > 0 ? 'font-semibold' : 'font-medium'}`}>
                                {th.userName || th.userEmail || th.userId}
                              </p>
                              <span className="text-[10px] text-muted-foreground ms-auto shrink-0">
                                {formatRelative(th.lastMessageAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className={`text-xs truncate flex-1 ${unread > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {th.lastMessageFrom === 'admin' && <span className="text-muted-foreground">{t('chat.youPrefix')}: </span>}
                                {th.lastMessage}
                              </p>
                              {unread > 0 && (
                                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-semibold text-white flex items-center justify-center shrink-0">
                                  {unread > 99 ? '99+' : unread}
                                </span>
                              )}
                            </div>
                            {th.userRole && (
                              <Badge variant={ROLE_VARIANT[th.userRole] || 'secondary'} className="text-[9px] mt-1 capitalize">
                                {th.userRole.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Conversation pane */}
              <div className="flex flex-col min-h-0">
                {!selected ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2">
                    <MessageCircle className="w-10 h-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium">{t('chat.selectThread')}</p>
                    <p className="text-xs text-muted-foreground">{t('chat.selectThreadDesc')}</p>
                  </div>
                ) : (
                  <>
                    {/* Thread header */}
                    <div className="px-4 py-3 border-b flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <UserIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{selected.userName || selected.userEmail}</p>
                        <p className="text-xs text-muted-foreground truncate">{selected.userEmail}</p>
                      </div>
                      {selected.userRole && (
                        <Badge variant={ROLE_VARIANT[selected.userRole] || 'secondary'} className="text-[10px] capitalize ms-auto">
                          {selected.userRole.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-muted/30">
                      {messages.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">{t('chat.noMessagesYet')}</p>
                      ) : (
                        messages.map(m => {
                          const mine = m.from === 'admin'
                          return (
                            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
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
                    <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t">
                      <input
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        placeholder={t('chat.typeReply')}
                        maxLength={2000}
                        className="flex-1 h-10 rounded-full bg-muted px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        disabled={sending}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                        disabled={!draft.trim() || sending}
                        aria-label={t('chat.send')}
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
