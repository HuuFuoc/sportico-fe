# Sportico — Smart Coach Hub (UI)

UI-only frontend cho **ProCoach AI**, một SaaS coaching platform với 3 role: **Learner**, **Coach**, **Admin**. Build từ thiết kế Stitch AI export, tuân thủ design system "Minimalist Sports Performance".

> Mọi dữ liệu hiện đang được mock — không có backend. Mọi component đọc qua `src/lib/api.ts` để dễ swap fetch() khi API thật sẵn sàng.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript strict |
| Styling | Tailwind CSS v4 (cấu hình qua `@theme` trong `globals.css`) |
| Icons | Material Symbols Outlined (Google Fonts) |
| Charts | recharts |
| State | zustand (role + sidebar) |
| Forms | (chưa cần) — input native; react-hook-form/zod đã cài sẵn |

---

## Quick start

```bash
pnpm install      # hoặc npm install / yarn
pnpm dev          # http://localhost:3000
pnpm build        # production build (63 static routes)
pnpm lint         # ESLint
```

Mở [http://localhost:3000](http://localhost:3000) → landing page → chọn role → vào dashboard.

**Dev mode** có **Role Switcher** ở góc dưới-trái — chuyển nhanh Learner / Coach / Admin và tự navigate sang dashboard tương ứng.

---

## Cấu trúc

```
src/
├── app/
│   ├── page.tsx                       # Landing với 3 role tiles
│   ├── layout.tsx                     # Inter font + Material Symbols
│   ├── globals.css                    # Tailwind @theme — full design system
│   ├── learner/                       # 8 routes
│   │   ├── dashboard/
│   │   ├── coaches/                   # browse + [id] profile
│   │   ├── ai-match/
│   │   ├── schedule/
│   │   ├── messages/
│   │   ├── progress/
│   │   └── settings/
│   ├── coach/                         # 8 routes
│   │   ├── dashboard/
│   │   ├── learners/
│   │   ├── schedule/
│   │   ├── messages/
│   │   ├── earnings/
│   │   ├── profile/
│   │   ├── settings/
│   │   └── session/[id]/              # 21 SSG paths
│   └── admin/                         # 4 routes
│       ├── dashboard/
│       ├── users/
│       ├── verifications/
│       └── revenue/
├── components/
│   ├── layout/                        # Sidebar, TopBar, AppShell, RoleSwitcher, AskAIPanel
│   ├── common/                        # StatCard, CoachCard, SessionRow, AIInsightBanner,
│   │                                  # AIBadge, ChartCard, EmptyState, MessagesView, ClientOnly
│   └── icons/MaterialIcon.tsx
├── lib/
│   ├── api.ts                         # ◀ Swap point — tất cả async, currently returns mock
│   ├── utils.ts                       # cn, formatCurrency, avatarFor, relativeDay...
│   ├── mock/                          # users, sessions, messages, earnings, analytics, insights
│   └── store/useAppStore.ts           # zustand: currentRole, sidebar state
└── types/index.ts                     # Đầy đủ types Learner/Coach/Admin/Session/...
```

---

## Design system

Tham chiếu `stitch_smart_coach_hub/minimalist_sports_performance_system/DESIGN.md`.

**Quy tắc bất biến:**
- Single accent: indigo `#3525cd` (primary), `#4f46e5` (primary-container)
- Card: `bg-surface-container-lowest` + `border 1px #e8e8e5` + `rounded-[10px]`
- Button/Input: `rounded-[6px]`, focus ring indigo, không shadow
- Typography: Inter only; hierarchy qua size + color (không qua weight)
- AI features đánh dấu bằng badge indigo + `auto_awesome` sparkle 12px
- Hover state = background shift sang `surface-container-low`, **không** dùng shadow
- Không gradient, không dark mode (phase này)

Mọi token đều khai báo trong [`src/app/globals.css`](src/app/globals.css) qua `@theme`.

---

## Mock data → API thật

Khi backend ready, **chỉ cần sửa `src/lib/api.ts`**. Mọi page đã wrap qua các method `api.fetchXxx()` (đã async sẵn).

Ví dụ swap `fetchCoaches`:

```ts
// Trước
export const api = {
  fetchCoaches: async () => getCoaches(),   // từ lib/mock/users
  ...
};

// Sau
export const api = {
  fetchCoaches: async () => {
    const r = await fetch("/api/coaches");
    return r.json() as Promise<Coach[]>;
  },
  ...
};
```

Types trong [`src/types/index.ts`](src/types/index.ts) là contract — backend nên match shape này.

**Pages hiện đang import mock data trực tiếp** (vd `mockCoaches`, `getCoachById`) — khi chuyển sang API thật, replace bằng `await api.fetchCoaches()` trong Server Components, hoặc dùng `use()` / SWR / React Query trong Client Components.

---

## Quan trọng — điểm chú ý khi tích hợp

1. **Auth chưa có.** `useAppStore.currentUserId` đang hard-code (`learner-1`, `coach-1`, `admin-1`). Khi có auth, đọc user ID từ session.
2. **Sidebar paths.** Three role variants trong `src/components/layout/Sidebar.tsx`. Thêm/sửa route nhớ update menu đó.
3. **Dynamic routes** dùng `generateStaticParams` (coach profiles + sessions). Khi data động, cân nhắc bỏ SSG hoặc dùng ISR.
4. **Charts** dùng `<ClientOnly>` wrapper để tránh recharts đo container = -1 trong SSG. Đừng bỏ wrapper.
5. **Material Symbols** load qua `<link>` trong `app/layout.tsx` — Next báo warning nhưng đây là cách đúng cho variable icon font.
6. **Avatars** dùng `i.pravatar.cc` placeholder. Khi có ảnh thật, đảm bảo dùng CDN hoặc add `images.remotePatterns` vào `next.config.ts` nếu chuyển sang `next/image`.

---

## Routes overview (63 static)

| Role | Routes |
|---|---|
| Public | `/` |
| Learner (8) | dashboard · coaches · coaches/[id] · ai-match · schedule · messages · progress · settings |
| Coach (8) | dashboard · learners · schedule · messages · earnings · profile · settings · session/[id] |
| Admin (4) | dashboard · users · verifications · revenue |

Mọi route đều `○ Static` hoặc `● SSG` — sẵn sàng deploy lên CDN.

---

## Scripts

```bash
pnpm dev          # dev server (Turbopack)
pnpm build        # production build
pnpm start        # serve production build
pnpm lint         # eslint
npx tsc --noEmit  # type check only
```

---

## License

Internal project — EXE202 / FPT-Ky8.
