"use client";

import { create } from "zustand";

/**
 * Shared open/closed state of the advisory chat panel.
 *
 * Lives in a tiny store (not local component state) so OTHER fixed bottom-right
 * controls — notably the scroll-to-top button — can react to it: the button
 * hides while the panel is open, and the FAB only "raises" above the button
 * when the panel is closed. This avoids the two controls overlapping.
 */
interface AdvisoryUiState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useAdvisoryUi = create<AdvisoryUiState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
