"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/common/AsyncStates";
import { PersonalProfileForm } from "@/components/settings/PersonalProfileForm";

// ── Page wrapper (Suspense required for useSearchParams) ──────────────────────

export default function AdminSettingsPage() {
  return (
    <Suspense
      fallback={
        <AppShell role="admin" title="Cài đặt">
          <LoadingState label="Đang tải cài đặt…" />
        </AppShell>
      }
    >
      <AdminSettingsInner />
    </Suspense>
  );
}

function AdminSettingsInner() {
  const params = useSearchParams();
  const fromLogin = params.get("fromLogin") === "1";

  return (
    <AppShell role="admin" title="Cài đặt">
      <div className="mx-auto max-w-[640px] pb-16">
        <header className="mb-6">
          <h1 className="text-[22px] font-bold tracking-tight text-on-surface">
            Cài đặt tài khoản
          </h1>
          <p className="mt-1 text-[13px] text-on-surface-variant">
            Thông tin cá nhân cho tài khoản quản trị viên.
          </p>
        </header>

        <div className="rounded-[14px] border border-[var(--color-border-soft)] bg-surface-container-lowest p-6 shadow-[0_1px_3px_rgba(15,15,30,0.04)]">
          <h2 className="mb-5 text-[14px] font-semibold text-on-surface">
            Hồ sơ cá nhân
          </h2>
          <PersonalProfileForm
            fromLogin={fromLogin}
            skipHref="/admin/dashboard"
          />
        </div>
      </div>
    </AppShell>
  );
}
