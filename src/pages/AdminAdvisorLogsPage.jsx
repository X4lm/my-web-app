import { useEffect, useMemo, useState } from 'react'
import { collection, query, orderBy, limit as fsLimit, onSnapshot, where, getDocs } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/firebase/config'
import { useLocale } from '@/contexts/LocaleContext'
import { useToast } from '@/components/ui/toast'
import { logError } from '@/utils/logger'
import AppLayout from '@/components/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import EmptyState from '@/components/ui/empty-state'
import { ScrollText, Filter, Scale, Database, Loader2 } from 'lucide-react'
import seedData from '@/scripts/seedLegalLibrary.json'

const INTENT_COLORS = {
  legal_query: 'bg-blue-500/10 text-blue-600 border-blue-400',
  portfolio_query: 'bg-purple-500/10 text-purple-600 border-purple-400',
  hybrid: 'bg-violet-500/10 text-violet-600 border-violet-400',
  general_chat: 'bg-muted text-muted-foreground border-border',
}

const QUALITY_COLORS = {
  normal: 'bg-emerald-500/10 text-emerald-600 border-emerald-400',
  tricky: 'bg-amber-500/10 text-amber-600 border-amber-400',
  low_info: 'bg-orange-500/10 text-orange-600 border-orange-400',
  high_stakes: 'bg-red-500/10 text-red-600 border-red-400',
  out_of_scope: 'bg-slate-500/10 text-slate-600 border-slate-400',
  unanswered_no_law: 'bg-yellow-500/10 text-yellow-700 border-yellow-500',
}

export default function AdminAdvisorLogsPage() {
  const { t, formatDateTime } = useLocale()
  const toast = useToast()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [intentFilter, setIntentFilter] = useState('all')
  const [qualityFilter, setQualityFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [libraryCount, setLibraryCount] = useState(null)
  const [seeding, setSeeding] = useState(false)

  // Check current library size so we can show/hide the seed CTA
  useEffect(() => {
    getDocs(collection(db, 'legalLibrary'))
      .then(snap => setLibraryCount(snap.size))
      .catch(err => { logError('[Library] count:', err); setLibraryCount(0) })
  }, [])

  async function handleSeed() {
    setSeeding(true)
    try {
      const seed = httpsCallable(functions, 'seedLegalLibrary')
      const res = await seed({ laws: seedData.laws })
      const n = res.data?.seeded ?? 0
      toast.success(`Seeded ${n} law${n === 1 ? '' : 's'} into the library.`)
      setLibraryCount(n)
    } catch (err) {
      logError('[Seed] failed:', err)
      toast.error(err.message || 'Seed failed. Check browser console.')
    } finally {
      setSeeding(false)
    }
  }

  useEffect(() => {
    const constraints = [orderBy('createdAt', 'desc'), fsLimit(200)]
    if (intentFilter !== 'all') constraints.unshift(where('intent', '==', intentFilter))
    if (qualityFilter !== 'all') constraints.unshift(where('quality', '==', qualityFilter))
    const q = query(collection(db, 'advisorAuditLog'), ...constraints)
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (err) => { logError('[AdvisorAudit] snapshot:', err); setLoading(false) })
    return unsub
  }, [intentFilter, qualityFilter])

  const filtered = useMemo(() => {
    if (!search.trim()) return logs
    const s = search.toLowerCase()
    return logs.filter(l =>
      (l.userMessage || '').toLowerCase().includes(s) ||
      (l.assistantMessage || '').toLowerCase().includes(s) ||
      (l.userId || '').toLowerCase().includes(s),
    )
  }, [logs, search])

  // Summary counts for the header strip
  const counts = useMemo(() => {
    const c = { total: logs.length, refused: 0, unanswered: 0, tricky: 0, highStakes: 0 }
    for (const l of logs) {
      if (l.refused) c.refused++
      if (l.quality === 'unanswered_no_law') c.unanswered++
      if (l.quality === 'tricky') c.tricky++
      if (l.quality === 'high_stakes') c.highStakes++
    }
    return c
  }, [logs])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ScrollText className="w-5 h-5" /> {t('adminAdvisor.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('adminAdvisor.subtitle')}</p>
        </div>

        {/* One-time seed CTA — only shown when the library has never been populated */}
        {libraryCount === 0 && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Legal library is empty</p>
                  <p className="text-xs text-muted-foreground">
                    Load the {seedData.laws.length} starter UAE laws. The advisor can't answer legal
                    questions until the library is populated. This draft is marked
                    "{seedData._reviewStatus}" — review with a lawyer before going live.
                  </p>
                </div>
              </div>
              <Button onClick={handleSeed} disabled={seeding} size="sm" className="shrink-0">
                {seeding
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Seeding…</>
                  : <>Seed starter library</>}
              </Button>
            </CardContent>
          </Card>
        )}
        {libraryCount != null && libraryCount > 0 && (
          <p className="text-xs text-muted-foreground">
            Legal library: {libraryCount} law{libraryCount === 1 ? '' : 's'} indexed.
          </p>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label={t('adminAdvisor.total')} value={counts.total} />
          <StatCard label={t('adminAdvisor.refused')} value={counts.refused} tone="destructive" />
          <StatCard label={t('adminAdvisor.unanswered')} value={counts.unanswered} tone="warning" />
          <StatCard label={t('adminAdvisor.tricky')} value={counts.tricky} tone="warning" />
          <StatCard label={t('adminAdvisor.highStakes')} value={counts.highStakes} tone="destructive" />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Filter className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="ps-9"
                placeholder={t('adminAdvisor.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              value={intentFilter}
              onChange={e => setIntentFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              aria-label={t('adminAdvisor.filterIntent')}
            >
              <option value="all">{t('adminAdvisor.allIntents')}</option>
              <option value="legal_query">legal_query</option>
              <option value="portfolio_query">portfolio_query</option>
              <option value="hybrid">hybrid</option>
              <option value="general_chat">general_chat</option>
            </select>
            <select
              value={qualityFilter}
              onChange={e => setQualityFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              aria-label={t('adminAdvisor.filterQuality')}
            >
              <option value="all">{t('adminAdvisor.allQuality')}</option>
              <option value="normal">normal</option>
              <option value="tricky">tricky</option>
              <option value="low_info">low_info</option>
              <option value="high_stakes">high_stakes</option>
              <option value="out_of_scope">out_of_scope</option>
              <option value="unanswered_no_law">unanswered_no_law</option>
            </select>
          </CardContent>
        </Card>

        {/* Log table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-sm text-muted-foreground py-12 text-center">{t('common.loading')}</p>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                title={t('adminAdvisor.noLogs')}
                description={t('adminAdvisor.noLogsDesc')}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead>{t('adminAdvisor.user')}</TableHead>
                      <TableHead>{t('adminAdvisor.intent')}</TableHead>
                      <TableHead>{t('adminAdvisor.quality')}</TableHead>
                      <TableHead>{t('adminAdvisor.question')}</TableHead>
                      <TableHead className="text-right">{t('adminAdvisor.tokens')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(l => (
                      <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(l)}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(l.createdAt)}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{(l.userId || '').slice(0, 8)}…</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${INTENT_COLORS[l.intent] || ''}`}>
                            {l.intent}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${QUALITY_COLORS[l.quality] || ''}`}>
                            {l.quality}
                          </Badge>
                          {l.refused && <Badge variant="destructive" className="ms-1 text-[10px]">refused</Badge>}
                        </TableCell>
                        <TableCell className="max-w-md truncate text-sm">{l.userMessage}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                          {(l.inputTokens || 0) + (l.outputTokens || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selected && <LogDetailDialog log={selected} onClose={() => setSelected(null)} />}
    </AppLayout>
  )
}

function StatCard({ label, value, tone }) {
  const toneClass = tone === 'destructive' ? 'text-destructive'
    : tone === 'warning' ? 'text-amber-600'
    : ''
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function LogDetailDialog({ log, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-card border rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Advisor turn detail</p>
          </div>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
        </div>
        <div className="p-4 space-y-4 text-sm">
          <Row label="Intent" value={log.intent} />
          <Row label="Quality" value={log.quality} />
          <Row label="Refused" value={String(log.refused)} />
          <Row label="User ID" value={log.userId} mono />
          <Row label="Chat ID" value={log.chatId} mono />
          <Row label="Model" value={log.model} />
          <Row label="Retrieved laws" value={(log.retrievedLawIds || []).join(', ') || '—'} />
          <Row
            label="Tool calls"
            value={(log.toolCalls || []).map(c => `${c.name}(${c.argSummary})`).join('\n') || '—'}
          />
          <div className="pt-2 border-t">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">User message</p>
            <p className="whitespace-pre-wrap">{log.userMessage}</p>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Assistant response</p>
            <p className="whitespace-pre-wrap">{log.assistantMessage}</p>
          </div>
          <div className="pt-2 border-t text-xs text-muted-foreground tabular-nums">
            in {log.inputTokens} · out {log.outputTokens} · cached {log.cachedReadTokens}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`col-span-2 text-xs ${mono ? 'font-mono' : ''} whitespace-pre-wrap`}>{value}</p>
    </div>
  )
}
