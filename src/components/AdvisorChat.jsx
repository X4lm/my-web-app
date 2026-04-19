import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Sparkles, Scale, ExternalLink } from 'lucide-react'
import { useAdvisor } from '@/hooks/useAdvisor'
import { useLocale } from '@/contexts/LocaleContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Floating advisor chat — bottom-right bubble that expands into a panel.
 * Available to any signed-in owner/property-manager.
 */
export default function AdvisorChat() {
  const { currentUser, userProfile } = useAuth()
  const { t, isRTL } = useLocale()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [openCitation, setOpenCitation] = useState(null) // for citation side panel
  const { messages, sending, error, send, startNewChat } = useAdvisor()
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, sending])

  // Hide for unauthed or restricted roles (tenants, vendors).
  if (!currentUser) return null
  const role = userProfile?.role
  if (role && !['owner', 'property_manager', 'staff', 'admin'].includes(role)) return null

  async function handleSend(e) {
    e?.preventDefault()
    const txt = input.trim()
    if (!txt || sending) return
    setInput('')
    await send(txt)
  }

  return (
    <>
      {/* Bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'fixed bottom-6 z-50 flex items-center gap-2 px-4 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all',
            isRTL ? 'start-6' : 'end-6',
          )}
          aria-label={t('advisor.open')}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">{t('advisor.bubble')}</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className={cn(
            'fixed bottom-6 z-50 w-[min(420px,calc(100vw-3rem))] h-[min(640px,calc(100vh-6rem))] rounded-xl border bg-card shadow-2xl flex flex-col',
            isRTL ? 'start-6' : 'end-6',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-semibold leading-tight">{t('advisor.title')}</p>
                <p className="text-[11px] text-muted-foreground">{t('advisor.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={startNewChat} className="h-7 text-xs">
                {t('advisor.newChat')}
              </Button>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-muted"
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && !sending && (
              <div className="text-center py-8 space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Scale className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium">{t('advisor.emptyTitle')}</p>
                <p className="text-xs text-muted-foreground px-4">{t('advisor.emptyDesc')}</p>
                <div className="flex flex-col gap-1.5 px-4">
                  {[t('advisor.sample1'), t('advisor.sample2'), t('advisor.sample3')].map(s => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="text-start text-xs p-2 rounded-md border bg-muted/30 hover:bg-muted transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(m => (
              <MessageBubble key={m.id} message={m} onOpenCitation={setOpenCitation} />
            ))}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('advisor.thinking')}
              </div>
            )}

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">
                {error}
              </div>
            )}
          </div>

          {/* Disclaimer + input */}
          <div className="border-t">
            <p className="text-[10px] text-muted-foreground px-4 pt-2">
              {t('advisor.disclaimer')}
            </p>
            <form onSubmit={handleSend} className="flex items-end gap-2 p-3">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                }}
                placeholder={t('advisor.placeholder')}
                rows={2}
                className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                disabled={sending}
              />
              <Button type="submit" size="icon" disabled={!input.trim() || sending}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Citation side panel */}
      {openCitation && (
        <CitationPanel citation={openCitation} onClose={() => setOpenCitation(null)} isRTL={isRTL} />
      )}
    </>
  )
}

function MessageBubble({ message, onOpenCitation }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
        )}
      >
        {message.content}
        {!isUser && Array.isArray(message.citations) && message.citations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
            {dedupeCitations(message.citations).map((c, i) => (
              <button
                key={i}
                onClick={() => onOpenCitation(c)}
                className="flex items-start gap-1 text-[11px] text-left hover:underline"
              >
                <Scale className="w-3 h-3 mt-0.5 shrink-0 opacity-70" />
                <span className="opacity-80">
                  {c.lawTitle} · Art. {c.articleNumber}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CitationPanel({ citation, onClose, isRTL }) {
  return (
    <div
      className={cn(
        'fixed bottom-6 z-50 w-[min(380px,calc(100vw-3rem))] h-[min(500px,calc(100vh-6rem))] rounded-xl border bg-card shadow-2xl flex flex-col',
        isRTL ? 'end-[min(460px,calc(100vw-0.5rem))]' : 'start-[min(460px,calc(100vw-0.5rem))]',
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <p className="text-sm font-semibold">{citation.lawTitle}</p>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Article</p>
          <p className="text-sm font-medium">{citation.articleNumber} — {citation.articleTitle}</p>
        </div>
        {citation.quotedText && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Cited text</p>
            <blockquote className="text-sm border-l-2 pl-3 italic text-muted-foreground">
              "{citation.quotedText}"
            </blockquote>
          </div>
        )}
        <a
          href={citation.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Official source <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

function dedupeCitations(citations) {
  const seen = new Set()
  return citations.filter(c => {
    const k = `${c.lawId}:${c.articleNumber}`
    if (seen.has(k)) return false
    seen.add(k); return true
  })
}
