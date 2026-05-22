/**
 * Frozen reference "now" for every piece of mock data.
 *
 * Mock fixtures MUST be deterministic. Deriving timestamps from the live
 * `new Date()` at module-evaluation time produces different values on the
 * server and on the client (the two evaluate the module at different
 * moments), which breaks React hydration and makes statically-rendered
 * output drift. Anchoring all relative timestamps to this single constant
 * keeps the demo stable, reproducible and hydration-safe.
 *
 * When the real API lands, this whole concept disappears — the backend
 * returns concrete timestamps and `src/lib/api.ts` is the swap point.
 */
export const NOW = new Date(2026, 4, 22, 14, 20, 0, 0); // 22 May 2026, 14:20 local
