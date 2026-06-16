// ============================================================================
// UI types for the AI advisory (coach-matching) chatbot.
//
// The wire envelope (Result<T> / BackendError) already lives in
// `src/lib/backend/dto.ts` — we do NOT redefine it here. These types describe
// only what the chat UI renders.
// ============================================================================

export type ChatRole = "user" | "assistant";

/** One bubble in the advisory conversation (UI-only, never sent to backend). */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Coach ids the assistant recommended for THIS reply (assistant turns only). */
  recommendedCoachIds?: string[];
  createdAt: string;
}

/** Normalized result of `api.sendAdvisoryMessage` (envelope already unwrapped,
 *  `recommendedCoachIds` guaranteed to be an array). */
export interface AdvisoryReply {
  conversationId: string;
  reply: string;
  recommendedCoachIds: string[];
}
