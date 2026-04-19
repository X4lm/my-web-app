import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import Anthropic from '@anthropic-ai/sdk'

import { SYSTEM_PROMPT } from './systemPrompt'
import { retrieveLaws, asDocumentBlocks } from './legal/retrieval'
import { portfolioTools, runTool } from './tools/portfolio'
import type { AuditLogEntry, Citation, IntentTag, QualityTag } from './types'

initializeApp()

// Secret — set via: firebase functions:secrets:set ANTHROPIC_API_KEY
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')

// Per-user rate limit (cheap abuse guard, tune as needed)
const MAX_TURNS_PER_DAY = 100
const MAX_USER_MESSAGE_CHARS = 2000

export const askAdvisor = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    region: 'us-central1',
    maxInstances: 10,
    timeoutSeconds: 120,
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')

    const db = getFirestore()

    // Optional: suspended users can't use the advisor.
    const userDoc = await db.collection('users').doc(uid).get()
    if (userDoc.exists && userDoc.data()?.suspended === true) {
      throw new HttpsError('permission-denied', 'Account is suspended.')
    }

    // ── Validate input ────────────────────────────────────────────────
    const data = request.data || {}
    const userMessage = String(data.message || '').trim()
    const chatId = String(data.chatId || '').trim() || db.collection('_').doc().id
    const priorMessages: { role: 'user' | 'assistant'; content: string }[] =
      Array.isArray(data.history) ? data.history.slice(-10) : [] // last 10 turns
    const languageHint = (data.language === 'ar' ? 'Arabic' : 'English') as 'English' | 'Arabic'

    if (!userMessage) throw new HttpsError('invalid-argument', 'Empty message.')
    if (userMessage.length > MAX_USER_MESSAGE_CHARS) {
      throw new HttpsError('invalid-argument', `Message exceeds ${MAX_USER_MESSAGE_CHARS} chars.`)
    }

    // ── Rate limit ────────────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10)
    const rlRef = db.collection('users').doc(uid).collection('advisorRateLimit').doc(today)
    const rlSnap = await rlRef.get()
    const currentCount = (rlSnap.data()?.count as number) || 0
    if (currentCount >= MAX_TURNS_PER_DAY) {
      throw new HttpsError('resource-exhausted', 'Daily advisor limit reached. Try again tomorrow.')
    }
    await rlRef.set({ count: currentCount + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true })

    // ── Retrieve relevant laws ────────────────────────────────────────
    // If the user mentions a property name or "Dubai"/"Abu Dhabi" we could
    // pass a jurisdiction hint. For v1 we let the model figure it out from
    // context and pass jurisdictionHint only if obvious.
    const lowered = userMessage.toLowerCase()
    const hint = lowered.includes('abu dhabi') ? 'Abu Dhabi'
      : lowered.includes('sharjah') ? 'Sharjah'
      : lowered.includes('dubai') ? 'Dubai'
      : undefined

    const retrieved = await retrieveLaws(userMessage, hint, 8)
    const docBlocks = asDocumentBlocks(retrieved)

    // ── Build Anthropic messages ──────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() })

    // First user turn includes the language hint + retrieved documents as
    // <document> content blocks (citations enabled).
    const initialContent: any[] = []
    if (docBlocks.length > 0) initialContent.push(...docBlocks)
    initialContent.push({
      type: 'text',
      text: `User language: ${languageHint}\n\nUser question: ${userMessage}`,
    })

    const messages: any[] = [
      // Replay prior turns (no docs — only current turn's docs are fresh).
      ...priorMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: initialContent },
    ]

    // ── Claude tool-use loop ──────────────────────────────────────────
    const toolCalls: { name: string; argSummary: string }[] = []
    let assistantFinalText = ''
    const citations: Citation[] = []
    let inputTokens = 0
    let outputTokens = 0
    let cachedReadTokens = 0
    const MAX_ITER = 6
    const MODEL = 'claude-opus-4-7'

    for (let i = 0; i < MAX_ITER; i++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        thinking: { type: 'adaptive' },
        system: [
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        ],
        tools: portfolioTools as any,
        messages,
      })

      inputTokens += response.usage.input_tokens || 0
      outputTokens += response.usage.output_tokens || 0
      cachedReadTokens += (response.usage as any).cache_read_input_tokens || 0

      const toolUses: any[] = []
      for (const block of response.content) {
        if (block.type === 'text') {
          assistantFinalText += (block as any).text
          // Collect citations attached to this text block (Anthropic format)
          const blockCitations = (block as any).citations || []
          for (const c of blockCitations) {
            // Each citation references a document index — map it back to
            // the retrieved articles.
            const docIdx = (c as any).document_index
            const src = retrieved.articles[docIdx]
            if (src) {
              citations.push({
                lawId: src.law.id,
                lawTitle: src.law.title,
                articleNumber: src.article.number,
                articleTitle: src.article.title,
                sourceUrl: src.law.sourceUrl,
                quotedText: (c as any).cited_text || '',
              })
            }
          }
        } else if (block.type === 'tool_use') {
          toolUses.push(block)
          toolCalls.push({
            name: (block as any).name,
            argSummary: JSON.stringify((block as any).input || {}).slice(0, 200),
          })
        }
      }

      if (response.stop_reason === 'end_turn' || toolUses.length === 0) break

      // Append assistant turn + tool results, loop again.
      messages.push({ role: 'assistant', content: response.content })
      const toolResults = []
      for (const tu of toolUses) {
        const out = await runTool((tu as any).name, (tu as any).input || {}, { uid })
        toolResults.push({
          type: 'tool_result',
          tool_use_id: (tu as any).id,
          content: JSON.stringify(out).slice(0, 8000),
        })
      }
      messages.push({ role: 'user', content: toolResults })
    }

    // ── Parse classification meta line ───────────────────────────────
    const { cleanedText, intent, quality, refused } = parseMeta(assistantFinalText)

    // ── Persist user-visible chat ─────────────────────────────────────
    const turnId = db.collection('_').doc().id
    const chatRef = db.collection('users').doc(uid).collection('advisorChats').doc(chatId)
    await chatRef.set({
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      lastMessage: cleanedText.slice(0, 200),
    }, { merge: true })

    const now = FieldValue.serverTimestamp()
    const msgsCol = chatRef.collection('messages')
    await msgsCol.add({
      role: 'user',
      content: userMessage,
      createdAt: now,
    })
    await msgsCol.add({
      role: 'assistant',
      content: cleanedText,
      citations,
      createdAt: now,
    })

    // ── Persist admin audit log ───────────────────────────────────────
    const audit: AuditLogEntry = {
      userId: uid,
      chatId,
      turnId,
      userMessage,
      assistantMessage: cleanedText,
      intent,
      quality,
      refused,
      retrievedLawIds: retrieved.laws.map(l => l.id),
      toolCalls,
      inputTokens,
      outputTokens,
      cachedReadTokens,
      model: MODEL,
      createdAt: now,
    }
    await db.collection('advisorAuditLog').add(audit as any)

    return {
      chatId,
      text: cleanedText,
      citations,
      intent,
      quality,
      refused,
    }
  },
)

// ──────────────────────────────────────────────────────────────────────
// Parse the trailing <meta .../> line the model emits per system prompt.
// If malformed, default to general_chat / normal / false.
// ──────────────────────────────────────────────────────────────────────
function parseMeta(raw: string): {
  cleanedText: string
  intent: IntentTag
  quality: QualityTag
  refused: boolean
} {
  const metaRx = /<meta\s+intent="([^"]+)"\s+quality="([^"]+)"\s+refused="([^"]+)"\s*\/?>/i
  const m = raw.match(metaRx)
  if (!m) return { cleanedText: raw.trim(), intent: 'general_chat', quality: 'normal', refused: false }

  const intent = (['legal_query', 'portfolio_query', 'hybrid', 'general_chat'].includes(m[1])
    ? m[1]
    : 'general_chat') as IntentTag
  const quality = (['normal', 'tricky', 'low_info', 'high_stakes', 'out_of_scope', 'unanswered_no_law'].includes(m[2])
    ? m[2]
    : 'normal') as QualityTag
  const refused = m[3].toLowerCase() === 'true'
  const cleanedText = raw.replace(metaRx, '').trim()
  return { cleanedText, intent, quality, refused }
}

// ──────────────────────────────────────────────────────────────────────
// One-time seed endpoint: read src/scripts/seedLegalLibrary.json and upsert
// each law into Firestore. Callable by admin only.
// ──────────────────────────────────────────────────────────────────────
export const seedLegalLibrary = onCall(
  { region: 'us-central1' },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')
    const db = getFirestore()
    const userDoc = await db.collection('users').doc(uid).get()
    if (userDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin only.')
    }
    const payload = request.data?.laws
    if (!Array.isArray(payload)) {
      throw new HttpsError('invalid-argument', 'Expected { laws: Law[] }.')
    }
    const batch = db.batch()
    for (const law of payload) {
      if (!law.id) continue
      batch.set(db.collection('legalLibrary').doc(law.id), {
        ...law,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })
    }
    await batch.commit()
    return { seeded: payload.length }
  },
)
