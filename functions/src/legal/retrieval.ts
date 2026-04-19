import { getFirestore } from 'firebase-admin/firestore'
import type { Law, LegalArticle } from '../types'

// Naïve keyword/topic retrieval. At ~6-50 laws this beats a vector DB on
// simplicity and debuggability. If the library grows > 200 laws, swap this
// for embeddings (voyage-law-2 or text-embedding-3-small) without touching
// any callers — only the ranking changes.

// Topic synonyms — keep this in one place so we can iterate based on the
// "unanswered_no_law" audit-log tags.
const TOPIC_SYNONYMS: Record<string, string[]> = {
  eviction: ['evict', 'kick out', 'remove tenant', 'terminate tenancy', 'eviction notice'],
  'rent-increase': ['raise rent', 'increase rent', 'rent hike', 'rera calculator', 'rent cap'],
  'security-deposit': ['deposit', 'damage deposit', 'refund deposit', 'withhold deposit'],
  'non-payment': ['late rent', 'unpaid rent', 'tenant not paying', 'rent arrears'],
  subletting: ['sublet', 'sublease', 'airbnb', 'short-term let'],
  ejari: ['ejari', 'lease registration', 'tenancy contract registration'],
  maintenance: ['repair', 'fix', 'broken', 'leaking', 'ac service', 'annual maintenance'],
  'lease-termination': ['end lease', 'break lease', 'terminate contract', 'exit clause'],
  'notice-period': ['90 day', '12 month', 'prior notice', 'written notice'],
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(Boolean)
}

function articlesMatching(question: string, articles: LegalArticle[]): LegalArticle[] {
  const q = question.toLowerCase()
  const qTokens = new Set(tokenize(q))

  // Expand question tokens with topic synonyms.
  const expandedTopics = new Set<string>()
  for (const [topic, synonyms] of Object.entries(TOPIC_SYNONYMS)) {
    if (qTokens.has(topic) || synonyms.some(s => q.includes(s))) {
      expandedTopics.add(topic)
    }
  }

  return articles
    .map(art => {
      let score = 0
      // Topic-tag match (strong signal)
      for (const t of art.topics) {
        if (expandedTopics.has(t)) score += 5
        if (qTokens.has(t)) score += 3
      }
      // Title match (medium)
      const titleTokens = tokenize(art.title)
      for (const t of titleTokens) if (qTokens.has(t)) score += 2
      // Body text match (weak — noisy, so light weight)
      const bodyTokens = tokenize(art.text)
      let bodyHits = 0
      for (const t of qTokens) if (t.length > 3 && bodyTokens.includes(t)) bodyHits++
      score += Math.min(bodyHits, 4) // cap body contribution
      return { art, score }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.art)
}

export interface RetrievedContext {
  laws: Law[]              // full law objects matched
  articles: {              // flat list of top articles across all matched laws
    law: Law
    article: LegalArticle
  }[]
}

/**
 * Given a user question, fetch all laws from Firestore, rank articles, and
 * return the top-K matches along with their parent-law metadata.
 */
export async function retrieveLaws(
  userQuestion: string,
  jurisdictionHint?: string, // 'Dubai' | 'Abu Dhabi' | 'UAE' — optional narrowing
  topK = 8,
): Promise<RetrievedContext> {
  const db = getFirestore()
  const snap = await db.collection('legalLibrary').get()
  const allLaws: Law[] = snap.docs.map(d => d.data() as Law)

  const ranked: { law: Law; article: LegalArticle; score: number }[] = []
  for (const law of allLaws) {
    // Jurisdiction filter: if a hint is provided, de-prioritize mismatches.
    // "UAE" = federal, always relevant. Otherwise prefer matching emirate.
    const matches = articlesMatching(userQuestion, law.articles || [])
    for (const art of matches) {
      let score = 1
      if (jurisdictionHint) {
        if (law.jurisdiction === jurisdictionHint) score *= 2
        else if (law.jurisdiction === 'UAE') score *= 1.5
        else score *= 0.5
      }
      ranked.push({ law, article: art, score })
    }
  }
  ranked.sort((a, b) => b.score - a.score)
  const top = ranked.slice(0, topK)

  // Deduplicate laws from the top articles so citations can point back.
  const lawIds = new Set(top.map(x => x.law.id))
  const laws = allLaws.filter(l => lawIds.has(l.id))

  return {
    laws,
    articles: top.map(x => ({ law: x.law, article: x.article })),
  }
}

/**
 * Format retrieved articles as Anthropic `document` content blocks with
 * citations enabled, so the model's response can cite back to them.
 */
export function asDocumentBlocks(ctx: RetrievedContext): any[] {
  return ctx.articles.map(({ law, article }) => ({
    type: 'document',
    source: {
      type: 'text',
      media_type: 'text/plain',
      data: `${law.title}\nArticle ${article.number} — ${article.title}\n\n${article.text}`,
    },
    title: `${law.title} · Art. ${article.number}`,
    context: `Jurisdiction: ${law.jurisdiction}. Year: ${law.year}. Source: ${law.sourceUrl}`,
    citations: { enabled: true },
  }))
}
