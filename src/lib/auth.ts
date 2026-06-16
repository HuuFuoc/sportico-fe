import type { Role } from "@/types";

// ============================================================================
// Centralized "current user" / role assumptions.
//
// TODO(auth): Sportico has NO real authentication yet. Until a session backend
// (cookie / JWT) exists, the current user is faked per role. This module is the
// single source of that assumption:
//
//   • Client Components read `currentUserId` from the zustand store, which is
//     seeded from DEV_USER_IDS (see `src/lib/store/useAppStore.ts`).
//   • Server Components (which cannot use the store) call `devUserIdForRole()`.
//
// When auth lands: resolve the user id from the verified session (middleware or
// a server helper), feed it into the store on the client, and delete
// DEV_USER_IDS. Every call site is marked with a `TODO(auth)` comment.
// ============================================================================

/** Hard-coded demo user ids, keyed by role. Replace with real session. */
export const DEV_USER_IDS: Record<Role, string> = {
  learner: "learner-1",
  coach: "coach-1",
  admin: "admin-1",
};

/**
 * The current user's id for a given role, in the dev/no-auth world.
 * TODO(auth): replace with the authenticated user id from the session.
 */
export function devUserIdForRole(role: Role): string {
  return DEV_USER_IDS[role];
}

/**
 * Post-login landing route for a role. The learner dashboard was removed, so
 * learners land on their training schedule; coach/admin keep their dashboards.
 */
export function dashboardPathForRole(role: Role): string {
  if (role === "learner") return "/learner/schedule";
  return `/${role}/dashboard`;
}

/** Safe default landing route when a role cannot be determined. */
export const DEFAULT_AUTHED_ROUTE = "/learner/schedule";
