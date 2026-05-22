"use client";

import { useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/icons/MaterialIcon";
import { cn } from "@/lib/utils";
import { useAppStore, type AppRole } from "@/lib/store/useAppStore";
import { getNotifications } from "@/lib/mock/insights";
import {
  getAdminById,
  getCoachById,
  getLearnerById,
} from "@/lib/mock/users";

interface TopBarProps {
  role: AppRole;
  title?: string;
}

function useCurrentUser(role: AppRole) {
  const id = useAppStore((s) => s.currentUserId);
  if (role === "coach") return getCoachById(id) ?? null;
  if (role === "admin") return getAdminById(id) ?? null;
  return getLearnerById(id) ?? null;
}

export function TopBar({ role, title }: TopBarProps) {
  const [showNotifs, setShowNotifs] = useState(false);
  const toggleMobileSidebar = useAppStore((s) => s.toggleMobileSidebar);
  const notifications = getNotifications();
  const unread = notifications.filter((n) => !n.read).length;
  const user = useCurrentUser(role);

  const placeholder =
    role === "coach"
      ? "Search learners or sessions..."
      : role === "admin"
        ? "Search analytics or users..."
        : "Search sessions or coaches...";

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-surface-container-lowest border-b border-[var(--color-border-soft)] flex items-center justify-between px-4 sm:px-6 z-30">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden -ml-1 p-2 rounded hover:bg-surface-container-low"
          aria-label="Toggle navigation"
        >
          <MaterialIcon name="menu" size={20} />
        </button>
        {title && (
          <h1 className="text-h3 text-on-surface truncate lg:hidden">
            {title}
          </h1>
        )}
        <div className="hidden sm:flex items-center bg-surface-container-low border border-[var(--color-border-soft)] rounded-[6px] px-3 h-9 max-w-md flex-1">
          <MaterialIcon
            name="search"
            size={18}
            className="text-on-surface-variant"
          />
          <input
            type="search"
            name="global-search"
            aria-label={placeholder}
            placeholder={placeholder}
            className="bg-transparent border-none outline-none text-body-sm w-full ml-2 placeholder:text-on-surface-variant"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {role === "coach" && (
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-medium uppercase tracking-wider rounded">
            <MaterialIcon name="bolt" size={14} filled />
            Coach Mode
          </span>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs((v) => !v)}
            className="relative p-2 rounded hover:bg-surface-container-low transition-colors"
            aria-label="Notifications"
          >
            <MaterialIcon
              name="notifications"
              size={20}
              className="text-on-surface-variant"
            />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface-container-lowest" />
            )}
          </button>
          {showNotifs && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifs(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest border border-[var(--color-border-soft)] rounded-[10px] shadow-sm z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--color-border-soft)] flex items-center justify-between">
                  <p className="text-h3 text-on-surface">Notifications</p>
                  <button className="text-body-sm text-primary hover:underline">
                    Mark all read
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={n.href ?? "#"}
                      onClick={() => setShowNotifs(false)}
                      className={cn(
                        "flex gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors border-b border-[var(--color-border-soft)] last:border-b-0",
                        !n.read && "bg-primary/[0.03]",
                      )}
                    >
                      <div className="w-8 h-8 rounded-[8px] bg-surface-container-high flex items-center justify-center shrink-0">
                        <MaterialIcon
                          name={n.icon ?? "info"}
                          size={16}
                          className="text-primary"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-body-base text-on-surface font-medium truncate">
                          {n.title}
                        </p>
                        <p className="text-body-sm text-on-surface-variant line-clamp-2">
                          {n.body}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          className="p-2 rounded hover:bg-surface-container-low transition-colors hidden sm:block"
          aria-label="Help"
        >
          <MaterialIcon
            name="help"
            size={20}
            className="text-on-surface-variant"
          />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2 pl-2 sm:pl-3 sm:border-l sm:border-[var(--color-border-soft)]">
          <div className="hidden sm:block text-right leading-tight">
            <p className="text-body-sm font-medium text-on-surface">
              {user?.name ?? "Guest"}
            </p>
            <p className="text-[11px] text-on-surface-variant capitalize">
              {role}
            </p>
          </div>
          <img
            src={user?.avatarUrl ?? "https://i.pravatar.cc/64?u=guest"}
            alt={user?.name ?? "User"}
            className="w-9 h-9 rounded-full object-cover border border-[var(--color-border-soft)]"
          />
        </div>
      </div>
    </header>
  );
}
