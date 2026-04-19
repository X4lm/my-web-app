// Shared types for the advisor agent.

export type IntentTag =
  | 'legal_query'
  | 'portfolio_query'
  | 'hybrid'
  | 'general_chat'

export type QualityTag =
  | 'normal'
  | 'tricky'
  | 'low_info'
  | 'high_stakes'
  | 'out_of_scope'
  | 'unanswered_no_law'

export interface LegalArticle {
  number: string
  title: string
  text: string
  topics: string[]
  textAr?: string
}

export interface Law {
  id: string
  title: string
  titleAr?: string
  jurisdiction: string
  year: number
  effectiveDate: string
  supersededBy: string | null
  sourceUrl: string
  summary: string
  articles: LegalArticle[]
}

// Message as stored in Firestore under users/{uid}/advisorChats/{chatId}/messages.
export interface StoredMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  createdAt: FirebaseFirestore.Timestamp | Date
}

export interface Citation {
  lawId: string
  lawTitle: string
  articleNumber: string
  articleTitle: string
  sourceUrl: string
  quotedText: string
}

// Audit-log entry written once per assistant turn.
export interface AuditLogEntry {
  userId: string
  chatId: string
  turnId: string
  userMessage: string
  assistantMessage: string
  intent: IntentTag
  quality: QualityTag
  refused: boolean
  retrievedLawIds: string[]
  toolCalls: { name: string; argSummary: string }[]
  inputTokens: number
  outputTokens: number
  cachedReadTokens: number
  model: string
  createdAt: FirebaseFirestore.FieldValue
}
