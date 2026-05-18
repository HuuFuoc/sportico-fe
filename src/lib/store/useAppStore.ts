"use client";

import { create } from "zustand";

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

const DEFAULT_USER_BY_ROLE: Record<AppRole, string> = {
  learner: "learner-1",
  coach: "coach-1",
  admin: "admin-1",
};

export const useAppStore = create<AppState>((set) => ({
  currentRole: "learner",
  currentUserId: DEFAULT_USER_BY_ROLE.learner,
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  setRole: (role) =>
    set({ currentRole: role, currentUserId: DEFAULT_USER_BY_ROLE[role] }),
  setCurrentUserId: (id) => set({ currentUserId: id }),
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleMobileSidebar: () =>
    set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
}));
