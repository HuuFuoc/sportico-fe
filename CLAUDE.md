# CLAUDE.md — Project Context

> File này được Claude tự load mỗi session. Đọc xong là có đủ context để bắt tay làm việc ngay.
> **Cập nhật file này** khi cấu trúc / convention thay đổi.

---

# Required Agent Plugins / Skills

This project must be worked on with the following agent workflows enabled or manually applied.

## Taste Skill
Source: https://github.com/leonxlnx/taste-skill
Installed via: `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`

Required behavior:
- Apply `design-taste-frontend`, `redesign-existing-projects`, `full-output-enforcement`.
- Do not create generic AI-looking UI — no oversized gradients, glassmorphism, fake badges, or unrelated decorative sections.
- Redesign existing screens based on **real backend capabilities** only.
- Maintain strong hierarchy, clean spacing, consistent typography, polished cards, and practical sports SaaS UX.
- Visual direction: **premium badminton / sports coaching SaaS** for Vietnam market.
- Detailed rules: `docs/agent-skills/taste-skill.md`

## Superpowers
Source: https://github.com/obra/superpowers
Installed via: `npx skills add https://github.com/obra/superpowers`

Required workflow:
- Inspect the codebase before editing.
- Plan work by module (DTO → endpoint → client → api.ts → component).
- Make small, safe changes — one concern per edit.
- Verify after each major batch: `npx tsc --noEmit`, `pnpm lint`, `pnpm build`.
- Do not claim completion if verification fails.
- Do not continue stale or unrelated tasks from previous sessions.
- Detailed rules: `docs/agent-skills/superpowers.md`

---

# Hard Project Boundaries

- **Work only in `D:\sportico-fe`** for frontend tasks.
- The backend repo `D:\sportico-platform` or `https://github.com/hoaikhoitran/sportico-platform` is **read-only reference** unless the user explicitly asks to modify backend.
- **Do not invent backend endpoints.** Confirm from backend source/docs/Swagger before adding.
- **Do not silently replace real API data with mock data.** Show error state and retry button if API fails.
- **Do not hotlink external athlete images in UI.** Use local assets from `public/images/` only.
- **Do not continue old tasks** about coach price hiding, Vercel stale deployment, PayOS withdrawal, or backend payout unless the user explicitly asks.
- **Run verification before claiming done**: `npx tsc --noEmit && pnpm lint && pnpm build`.

---

## 1. Dự án là gì

**Sportico — Smart Coach Hub** (legacy name: *ProCoach AI*).
**Frontend-only UI** cho một SaaS marketplace coaching AI-native với 3 role:

- **Learner** — người tập luyện đi tìm coach
- **Coach** — huấn luyện viên cung cấp dịch vụ
- **Admin** — quản trị platform

**Mọi dữ liệu hiện đang mock** — không có backend. Pages đọc trực tiếp từ `src/lib/mock/*` hoặc qua `src/lib/api.ts` (wrapper async, là điểm sẽ swap khi backend ready).

---

## 2. Tech stack

| Layer | Choice | Ghi chú |
|---|---|---|
| Framework | **Next.js 16 (App Router)** + React 19 + TypeScript strict | App Router everywhere |
| Styling | **Tailwind CSS v4** (token qua `@theme` trong `globals.css`) | Không có `tailwind.config.*` — tất cả token nằm trong CSS |
| Motion | **`motion/react`** (Framer Motion v12) | Import từ `motion/react`, KHÔNG phải `framer-motion` |
| Icons | **Hai bộ song song**: `lucide-react` (mới) + `MaterialIcon` (cũ, Google Material Symbols) | Code mới dùng Lucide; vẫn còn rất nhiều `<MaterialIcon name="…" />` ở các page legacy |
| Charts | **recharts** v3.8 | Luôn wrap trong `<ClientOnly>` |
| State | **zustand** v5 | Store ở `src/lib/store/useAppStore.ts` — role + sidebar |
| Forms | **react-hook-form** + **zod** v4 | Tự viết `zodResolver` mỏng (tránh phải cài `@hookform/resolvers`) |
| Package manager | **pnpm** | Có `pnpm-lock.yaml` + `pnpm-workspace.yaml` |

**Scripts:**
```bash
pnpm dev          # dev server (Turbopack mặc định)
pnpm build        # production build
pnpm lint         # eslint
npx tsc --noEmit  # type-check only
```

---

## 3. Folder structure

```
src/
├── app/
│   ├── layout.tsx               # Root: Inter font + Material Symbols stylesheet + metadata
│   ├── globals.css              # Tailwind v4 @theme — design tokens + custom keyframes
│   ├── (auth)/                  # ◀ Route group — light premium SaaS auth UI
│   │   ├── layout.tsx           # 2-column: hero left, form right; light bg
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (public)/                # ◀ Marketing landing + public-facing routes
│   │   ├── layout.tsx           # PublicNavbar (transparent over hero) + Footer
│   │   └── page.tsx             # Landing với 8 scene A → H
│   ├── learner/                 # 8 routes (AppShell)
│   ├── coach/                   # 8 routes (AppShell) + session/[id] SSG
│   └── admin/                   # 6 routes (AppShell)
├── components/
│   ├── auth/                    # AuthBackground, AuthHero, AuthCard, PasswordField,
│   │                            # PasswordStrength, SocialButtons
│   ├── ui/                      # AuthInput, AuthButton, Checkbox, Divider (light SaaS)
│   ├── layout/                  # AppShell, Sidebar, TopBar, PublicNavbar, Footer,
│   │                            # RoleSwitcher (dev), AskAIPanel
│   ├── common/                  # StatCard, CoachCard, SessionRow, AIInsightBanner,
│   │                            # AIBadge, ChartCard, ClientOnly, EmptyState, MessagesView,
│   │                            # UserAvatar (◀ the ONLY avatar component — see 8g)
│   ├── dashboard/               # ActivityHeatmap, ProgressRing, Sparkline, AICoachCard
│   ├── coach/                   # DataViz
│   ├── landing/                 # HeroSection (GRIND-style), HeroPreview, MatchExplainer,
│   │                            # CoachShowcaseCard, DashboardPreview, AnimatedNumber, Motion
│   └── icons/MaterialIcon.tsx   # Variable-font wrapper
├── lib/
│   ├── api.ts                   # ◀ ALL async functions — swap point khi có backend
│   ├── utils.ts                 # cn (clsx+twMerge), formatCurrency, relativeDay, localDateKey
│   ├── avatar.ts                # getUserInitials(name, email), getAvatarPalette(seed) — see 8g
│   ├── mock/                    # users, sessions, messages, earnings, analytics,
│   │                            # insights, wellness, clock (NOW)
│   ├── store/useAppStore.ts     # zustand: currentRole, currentUserId, sidebar state
│   ├── validation/auth.ts       # zod schemas (loginSchema, registerSchema) +
│   │                            # password strength + tiny zodResolver
│   └── athlete-metrics.ts       # Derived metrics helpers
└── types/index.ts               # Single source of truth domain types
```

**Path alias:** `@/*` → `./src/*`. Dùng nhất quán, đừng dùng relative `../../`.

**Public assets** ở `public/`:
- `logo.png` — brand logo (Sportico wordmark + ball)
- `hero.webp` — full-bleed hero image (landing scene A)

`assets/` ở root là staging cho file gốc trước khi copy sang `public/` — đừng reference trực tiếp.

---

## 4. Routing map

| Group | Path | Layout |
|---|---|---|
| Public | `/` | `(public)/layout.tsx` — PublicNavbar `transparent` + Footer |
| Auth | `/login`, `/register` | `(auth)/layout.tsx` — split 2-column light, không có nav |
| Learner (8) | `/learner/{dashboard,coaches,coaches/[id],ai-match,schedule,messages,progress,settings}` | `AppShell role="learner"` |
| Coach (9) | `/coach/{dashboard,learners,schedule,messages,earnings,profile,settings,session/[id]}` | `AppShell role="coach"` |
| Admin (11) | `/admin/{dashboard,users,verifications,bank-verifications,revenue,withdrawals,vouchers,community,reports,reviews,settings}` | `AppShell role="admin"` |

**AppShell** = Sidebar trái 256px + TopBar trên 64px + main content + optional right rail (Ask AI). Sticky.

**Dev mode:** Có `<RoleSwitcher>` ở góc dưới-trái, đổi role nhanh + navigate.

---

## 5. Design system — HAI hệ song song

### 5a. In-app shell (legacy "Minimalist Sports Performance")

Áp dụng cho mọi route trong `learner/`, `coach/`, `admin/`. Quy tắc bất biến:

- **Single accent**: indigo `#3525cd` (primary), `#4f46e5` (primary-container)
- **Card**: `bg-surface-container-lowest` + `border 1px var(--color-border-soft)` + `rounded-[10px]`
- **Button/Input**: `rounded-[6px]`, focus ring indigo, KHÔNG shadow
- **Typography**: Inter only. Hierarchy qua **size + color**, không qua weight
- **AI features**: badge indigo `bg-primary/10` + sparkle icon 12px
- **Hover**: background shift sang `surface-container-low`, KHÔNG dùng shadow
- **Không gradient, không dark mode**

Token đầy đủ trong [src/app/globals.css](src/app/globals.css) qua `@theme {…}`.
Quy chiếu chi tiết: [docs/DESIGN.md](docs/DESIGN.md).

### 5b. Premium dashboards (sau nhiều lần redesign — phổ biến nhất hiện tại)

Nhiều page (coach dashboard, admin revenue, learner progress, schedule, messages…) đã được redesign theo style **Stripe / Linear / Notion** với:

- **Gradient tile** cho icon (indigo → violet → fuchsia / emerald / amber / rose)
- **20px radius** card, `shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.06)]`
- **Motion entrance** (`motion/react` fade-up + stagger)
- **Lucide icons** thay MaterialIcon
- **Sparklines** trong KPI cards (recharts mini LineChart)
- **layoutId pill** cho filter tabs (animated active background)
- **AI banner gradient** (primary/[0.06] → violet/[0.06]) thay yellow alert cũ

Khi sửa các page này, **giữ đồng bộ với pattern xung quanh** trên cùng route. Tham khảo accent palette chung:

```ts
const ACCENTS = {
  indigo:  "from-primary to-[#7d6dff]",
  violet:  "from-[#8b5cf6] to-[#c084fc]",
  emerald: "from-[#10b981] to-[#34d399]",
  amber:   "from-[#f59e0b] to-[#fb923c]",
  rose:    "from-[#f43f5e] to-[#fb7185]",
};
```

### 5c. Finance/Ops console pages (admin/revenue)

Restrained — **bớt gradient**, dày dày dữ liệu, radius nhỏ (10–12px), tabular-nums, mono cho ID, semantic color cứng (green/amber/red/blue). Đừng "Dribbble" hóa các trang này.

### 5d. Auth (`(auth)/`)

**Light premium SaaS** — Stripe/Linear style sau redesign mới nhất:

- Bg: `bg-slate-50` + 2 soft pastel orb (violet `300/30` + cyan `200/40`)
- Card: white, slate-200 border, 24px radius, soft 2-layer shadow
- Input: white bg, slate-200 border, focus → violet-500 border + violet-100 ring
- Primary button: gradient `violet-600 → fuchsia-500`, hover lift `-1px`
- Ghost button: white + slate-200 border (cho Google/GitHub)
- Text: `slate-900` primary, `slate-500` muted
- **KHÔNG dark mode, KHÔNG glassmorphism nặng, KHÔNG sparkles**

Trust signals: `2,000+ athletes` social proof + `SOC 2 · GDPR ready` shield xanh.

### 5e. Landing hero (Scene A — `HeroSection.tsx`)

**Dark immersive** — GRIND-style full-bleed image hero:

- Bg `#0a0a0e` + image `/hero.webp` parallax theo chuột
- Gradient overlay trái-tối → phải-sáng để headline đọc
- Watermark "SPORTICO™" 18vw ở đáy, opacity 6%
- Word cycling ở H1 (`MENTAAL & FYSIEK → FOCUS & FORM → STRENGTH & FLOW`)
- 14 sparkle particles deterministic
- MembersCard pill ở góc phải dưới (avatar stack + count-up)

PublicNavbar tự đổi `transparent` ↔ `solid` khi scroll qua 40px.

---

## 6. Mock data — API swap point

**Mọi async đi qua [src/lib/api.ts](src/lib/api.ts)**. Hiện return từ `src/lib/mock/*`. Khi có backend:

```ts
// Trước
fetchCoaches: async () => getCoaches(),

// Sau
fetchCoaches: async () => {
  const r = await fetch("/api/coaches");
  return r.json() as Promise<Coach[]>;
}
```

**Types ở [src/types/index.ts](src/types/index.ts) là contract** — backend nên match shape.

**Lưu ý**: nhiều page hiện tại đang import mock data **trực tiếp** (vd `mockCoaches`, `getCoachById`) thay vì qua `api.*`. Khi swap, refactor sang `await api.fetchXxx()` trong Server Components hoặc `use()` / SWR / React Query trong Client Components.

**`NOW` constant** ở `src/lib/mock/clock.ts` là "current time" giả định cho mock data → đảm bảo session "today" / "upcoming" deterministic. Đừng dùng `new Date()` trực tiếp khi so sánh với mock data.

---

## 7. State & auth

- **Auth chưa có thật**. `useAppStore.currentUserId` hard-code: `learner-1` / `coach-1` / `admin-1` tùy role.
- Login/Register forms gọi `setTimeout` giả lập API + `window.location.href = "/learner/dashboard"`. Khi backend ready, swap bằng real auth.
- Test error path: gõ `wrong@example.com` (login) hoặc `taken@example.com` (register) để thấy server error banner.

---

## 8. Convention khi viết code mới

### 8a. Motion
```ts
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
// KHÔNG: import từ "framer-motion"
```
- Luôn check `useReducedMotion()` và tắt animation khi user yêu cầu.
- Ease custom dùng nhiều nhất: `[0.16, 1, 0.3, 1]`.
- Stagger entry: `delay: 0.05 + i * 0.04` (cap ~0.3).

### 8b. Lucide vs MaterialIcon
- **Code mới → Lucide** (`import { Sparkles } from "lucide-react"`).
- Đừng thay loạt MaterialIcon → Lucide trong page legacy nếu không có yêu cầu (sẽ tạo PR khổng lồ).

### 8c. Charts
- Luôn wrap `<ResponsiveContainer>` trong `<ClientOnly fallback={<Skeleton/>}>` — không thì SSG báo `width = -1`.
- Tooltip custom thay default Recharts (style của Recharts xấu, không khớp design).

### 8d. Form
- `useForm({ resolver: zodResolver(schema), mode: "onBlur" })`.
- Sử dụng `zodResolver` tự viết ở `src/lib/validation/auth.ts` (KHÔNG cài `@hookform/resolvers`).
- Error: `errors.field?.message` truyền vào `<AuthInput error={…}>`.

### 8e. Class merging
```ts
import { cn } from "@/lib/utils";   // = twMerge(clsx(...))
```

### 8f. Tabular numerals
Mọi value tài chính / metric / count → `tabular-nums`. Đặc biệt quan trọng cho table và KPI.

### 8g. Avatar
**Không còn avatar random / third-party** (đã bỏ `avatarFor()` / pravatar.cc hoàn toàn). Quy tắc:

- Component dùng chung duy nhất: `<UserAvatar avatarUrl={..} name={..} email={..} size="xs|sm|md|lg|xl" />` ở `src/components/common/UserAvatar.tsx`.
- Có ảnh hợp lệ (load thành công) → hiện ảnh. Không có ảnh / ảnh lỗi → hiện initials (nền màu deterministic theo tên/email, không đổi mỗi lần render).
- Logic tạo initials chỉ nằm ở `getUserInitials(name, email)` trong `src/lib/avatar.ts` — đừng viết `.slice(0,1)`/`.charAt(0)` riêng lẻ ở component khác.
- `avatarUrl` rỗng/`""`/`null` từ mock hoặc backend là hợp lệ ("chưa có ảnh") — `UserAvatar` tự fallback, không cần `?? avatarFor(...)` hay URL mặc định nào khác.
- Raw `<img>` (không phải `next/image`) — nhất quán với phần còn lại của codebase.

---

## 9. Gotchas

1. **`<ClientOnly>` wrapper bắt buộc cho Recharts** — bỏ ra là SSG fail.
2. **Material Symbols** load qua `<link>` trong `app/layout.tsx` — Next báo warning nhưng đúng cho variable icon font.
3. **`<Cell>` của Recharts** báo deprecated trong type system — vẫn dùng được, ignore warning.
4. **Logo image** có nền xanh đậm — đẹp trên white sidebar/footer; trên dark hero (PublicNavbar transparent) đã có ring trắng + shadow để contrast.
5. **`outputFileTracingRoot: process.cwd()`** trong `next.config.ts` cần thiết cho Vercel build (đừng đổi sang `__dirname` — ESM context).
6. **Route group `(auth)` và `(public)`** không tạo URL segment — `/login` chứ không phải `/auth/login`.
7. **Path alias `@/`** chỉ map src tuyệt đối — không nest sâu hơn vd `@/lib/mock/users` thay `@/src/lib/...`.
8. **Dynamic routes** (`coach/session/[id]`, `learner/coaches/[id]`) dùng `generateStaticParams` → SSG. Khi data động, đổi sang ISR hoặc bỏ SSG.

---

## 10. Recent design refresh log

| Khi nào | Page | Trước → Sau |
|---|---|---|
| 2026-05 | `/learner/messages` | Flat list → Premium AI chat (gradient avatar, animated filter pill, message stagger, typing indicator) |
| 2026-05 | `/learner/progress` | Admin-style → Apple Fitness-style (achievement badges với tier, KPI sparklines, AI coach card) |
| 2026-05 | `/learner/schedule` | Single column → 2-col (calendar + sidebar AI coach + upcoming + quick actions) |
| 2026-05 | `/coach/dashboard` | Plain → Premium 2-col với charts (sessions bar, earnings line, engagement donut), AI Ops card |
| 2026-05 | `/coach/schedule` | Time grid noisy → Stripe-clean (absolute-positioned session blocks, now-indicator, sidebar AI/today/upcoming) |
| 2026-05 | `/coach/earnings` | Generic charts → Hero earnings (56px gradient number), AI insights sidebar, expandable payout table |
| 2026-05 | `/coach/profile` | Form-heavy → Profile builder (hero progress widget, AI bio assistant, pricing intelligence, sticky save bar) |
| 2026-05 | `/admin/dashboard` | Generic → Command center (live telemetry chip, hero $842K, 5 KPI tile, DAU/Revenue/Heatmap/Retention, AI ops sidebar) |
| 2026-05 | `/admin/users` | Spreadsheet → Linear/Airtable (animated tabs, sortable headers, expandable rows, bulk action bar, insights sidebar) |
| 2026-05 | `/admin/verifications` | Flat queue → 3-column moderation console (queue + center review + AI trust panel + keyboard shortcuts A/R/J/K + reject modal) |
| 2026-05 | `/admin/revenue` | Marketing dashboard → Finance ops console (KPI strip với anomaly markers, dense payout table, AI alerts) |
| 2026-05 | `/` (landing Scene A) | Light hero → GRIND-style dark full-bleed image hero |
| 2026-05 | `/` (landing Scene B) | 4-tile symmetric stats → asymmetric 60/40 (featured AI 94% với sparkline + 3 supporting + eyebrow trust + testimonial footer); bỏ grid + sparkles bg, unified slate/violet icon palette — file [StatStrip.tsx](src/components/landing/StatStrip.tsx) |
| 2026-05 | `/login`, `/register` | Dark cyberpunk → Light Stripe/Linear (auth UI redesign) |
| 2026-05 | Whole brand | "ProCoach AI" + rocket icon → **"Sportico"** + custom logo PNG |

---

## 11. Khi user yêu cầu redesign 1 page

Mặc định họ muốn:
- **Motion entrance** stagger
- **Gradient icon tiles** (indigo/violet/emerald/amber palette)
- **Sparklines / mini-charts** trong KPI
- **AI Coach / Ops card** với gradient surface + Sparkles avatar + Live chip
- **2-column layout** main + sidebar (insights/quick actions)
- **Animated tab pills** dùng `layoutId`
- **Hover lift -2 / -3px** + shadow upgrade
- **Lucide icons** + `useReducedMotion()` respect

Đừng quên: **type-check + lint sạch** bằng `npx tsc --noEmit` và `npx eslint <file>`.

---

## 12. Quick reference

- **Build/lint commands**: section 2.
- **Color tokens**: `globals.css` `@theme { … }`.
- **Domain types**: `src/types/index.ts`.
- **Mock data location**: `src/lib/mock/`.
- **API swap point**: `src/lib/api.ts`.
- **Default user IDs**: `learner-1`, `coach-1`, `admin-1`.
- **NOW (mock clock)**: `src/lib/mock/clock.ts`.
- **Design doc**: `docs/DESIGN.md` (legacy minimalist system).
- **Home page scene breakdown**: `docs/home-page.md`.
