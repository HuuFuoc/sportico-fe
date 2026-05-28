"use client";

import { create } from "zustand";
import { DEV_USER_IDS } from "@/lib/auth";

export type AppRole = "learner" | "coach" | "admin";

interface AppState {
  currentRole: AppRole;
  currentUserId: string;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  setRole: (role: AppRole) => void;
  setCurrentUserId: (id: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

// TODO(auth): `currentUserId` is seeded from hard-coded demo ids. Centralized
// in `@/lib/auth`; replace with the authenticated session user when auth lands.
export const useAppStore = create<AppState>((set) => ({
  currentRole: "learner",
  currentUserId: DEV_USER_IDS.learner,
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  setRole: (role) =>
    set({ currentRole: role, currentUserId: DEV_USER_IDS[role] }),
  setCurrentUserId: (id) => set({ currentUserId: id }),
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleMobileSidebar: () =>
    set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
}));
