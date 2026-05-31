# Sportico Frontend — Tổng hợp trạng thái & cách hoạt động

> Tài liệu này mô tả toàn bộ những gì frontend **đã làm**, **chưa làm**, và **cách hệ thống hoạt động** tại thời điểm 2026-05-31.
> Cập nhật khi có thay đổi lớn về route, architecture, hoặc backend integration.

---

## Mục lục

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Tech stack](#2-tech-stack)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Kiến trúc & cách hoạt động](#4-kiến-trúc--cách-hoạt-động)
5. [Routes đã hoàn thành](#5-routes-đã-hoàn-thành)
6. [Components đã xây dựng](#6-components-đã-xây-dựng)
7. [Design system](#7-design-system)
8. [Mock data & API layer](#8-mock-data--api-layer)
9. [State management & Auth](#9-state-management--auth)
10. [Những gì CHƯA làm / cần hoàn thiện](#10-những-gì-chưa-làm--cần-hoàn-thiện)
11. [Backend integration status](#11-backend-integration-status)
12. [Thống kê nhanh](#12-thống-kê-nhanh)

---

## 1. Tổng quan dự án

**Sportico — Smart Coach Hub** là SaaS marketplace kết nối learner (người tập) với coach (huấn luyện viên) trong lĩnh vực thể thao và wellness, tích hợp AI matching.

**Ba role người dùng:**
| Role | Mô tả |
|------|-------|
| **Learner** | Người tập tìm kiếm coach, đặt lịch, theo dõi tiến độ |
| **Coach** | Huấn luyện viên cung cấp dịch vụ, quản lý lịch và thu nhập |
| **Admin** | Quản trị platform, duyệt verification, quản lý doanh thu |

**Trạng thái hiện tại:** Frontend-only với mock data. Backend Azure đã tồn tại và được tích hợp một phần thông qua `/api-proxy`.

---

## 2. Tech stack

| Thành phần | Công nghệ | Ghi chú |
|-----------|-----------|---------|
| Framework | **Next.js 16.2.6** (App Router) + React 19 | SSR + SSG + Client Components |
| Language | **TypeScript strict** | Toàn bộ codebase |
| Styling | **Tailwind CSS v4** | Tokens qua `@theme` trong `globals.css`, không có `tailwind.config.*` |
| Animation | **`motion/react`** v12 (Framer Motion) | Import từ `motion/react`, KHÔNG `framer-motion` |
| Animation (complex) | **GSAP** v3.15 | Timeline sequences phức tạp |
| Icons | **Lucide React** v1.16 (mới) + **MaterialIcon** (cũ) | Code mới dùng Lucide |
| Charts | **Recharts** v3.8 | Luôn wrap trong `<ClientOnly>` |
| State | **Zustand** v5 | Global role + sidebar + auth state |
| Forms | **react-hook-form** v7 + **Zod** v4 | Custom zodResolver (không cài `@hookform/resolvers`) |
| Package manager | **pnpm** | `pnpm-lock.yaml` + `pnpm-workspace.yaml` |

**Scripts:**
```bash
pnpm dev          # dev server (Turbopack)
pnpm build        # production build
pnpm lint         # ESLint
npx tsc --noEmit  # type-check only
```

---

## 3. Cấu trúc thư mục

```
sportico/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root: Inter font + Material Symbols + metadata
│   │   ├── globals.css             # Tailwind v4 @theme — toàn bộ design tokens
│   │   ├── (auth)/                 # Route group auth — 2-column light SaaS UI
│   │   ├── (public)/               # Marketing + public pages
│   │   ├── learner/                # 11 routes (AppShell)
│   │   ├── coach/                  # 11 routes (AppShell)
│   │   ├── admin/                  # 8 routes (AppShell)
│   │   ├── onboarding/             # Coach onboarding flow
│   │   └── payment/                # Payment success/fail pages
│   ├── components/
│   │   ├── auth/                   # 8 components auth flow
│   │   ├── coach/                  # 3 components (guard, viz, withdraw modal)
│   │   ├── common/                 # 13 shared components
│   │   ├── dashboard/              # 4 chart/widget components
│   │   ├── icons/                  # MaterialIcon wrapper
│   │   ├── landing/                # 18 landing page sections/components
│   │   ├── layout/                 # 7 layout components (AppShell, Sidebar, TopBar…)
│   │   ├── learner/                # CoachBrowser
│   │   ├── reactbits/              # SpotlightCard (3rd-party effect)
│   │   ├── settings/               # PersonalProfileForm
│   │   └── ui/                     # 5 base UI components
│   ├── lib/
│   │   ├── api.ts                  # ← SWAP POINT: tất cả async functions
│   │   ├── api-client.ts           # HTTP client với CORS proxy
│   │   ├── api-endpoints.ts        # Backend URL constants
│   │   ├── auth*.ts                # Auth utilities, token, session
│   │   ├── backend/                # client.ts, dto.ts, endpoints.ts, mappers.ts
│   │   ├── mock/                   # 8 mock data files
│   │   ├── store/                  # useAppStore, useAuthStore (Zustand)
│   │   ├── validation/auth.ts      # Zod schemas
│   │   └── utils.ts                # cn, formatCurrency, avatarFor, initials…
│   └── types/
│       └── index.ts                # Single source of truth — 35+ domain types
├── public/
│   ├── logo.png                    # Sportico wordmark + ball
│   └── hero.webp                   # Full-bleed hero image
├── docs/
│   ├── DESIGN.md                   # Legacy minimalist design system
│   ├── home-page.md                # Landing page scene breakdown
│   └── frontend-api-gaps.md        # Tracked API integration gaps
└── next.config.ts                  # Proxy rewrite + outputFileTracingRoot
```

---

## 4. Kiến trúc & cách hoạt động

### 4.1 Luồng data tổng quát

```
Browser
  └─► Next.js App Router (SSR / Client Components)
        └─► src/lib/api.ts  (swap point)
              ├─► [mock mode]  src/lib/mock/*.ts  (static fixtures)
              └─► [live mode]  /api-proxy/*  (Next.js rewrite)
                                  └─► Azure Backend
                                        (sportico-api.azurewebsites.net)
```

**Mock mode** được bật khi `NEXT_PUBLIC_API_BASE_URL` chưa được set, hoặc không có Bearer token (SSR fallback). Hàm `isMockMode()` và `liveAuthed()` trong `api-client.ts` kiểm soát điều này.

### 4.2 Proxy CORS

`next.config.ts` có rewrite rule:
```
/api-proxy/:path*  →  https://sportico-api-*.azurewebsites.net/:path*
```
Browser gọi cùng origin → Next.js forward server-side → không bị CORS block.

### 4.3 Route layout hierarchy

```
app/layout.tsx (root — font, metadata)
├── (public)/layout.tsx   → PublicNavbar (transparent/solid) + Footer
├── (auth)/layout.tsx     → 2-column: hero trái / form phải
├── learner/layout.tsx    → AppShell role="learner"
├── coach/layout.tsx      → AppShell role="coach"
└── admin/layout.tsx      → AppShell role="admin"
```

**AppShell** = Sidebar 256px trái (sticky) + TopBar 64px trên (sticky) + main content + optional AskAIPanel (right rail).

### 4.4 Authentication flow (hiện tại — mock)

```
Login form
  └─► authApi.login() → setTimeout 800ms → demo success
        └─► lưu fake token vào localStorage
              └─► window.location.href = "/learner/dashboard"

Guards (LearnerGuard, CoachGuard):
  └─► Bypass hoàn toàn trong mock mode
        └─► Mọi route render trực tiếp với mock fixtures
```

Khi backend live: swap `authApi.login()` thành real POST `/api/auth/login`, guards đọc token thật.

### 4.5 State management

| Store | File | Chứa gì |
|-------|------|---------|
| `useAppStore` | `lib/store/useAppStore.ts` | `currentRole`, `currentUserId`, `sidebarOpen` |
| `useAuthStore` | `lib/store/useAuthStore.ts` | `isLoggedIn`, `role`, `notifications[]` |

`currentUserId` hard-code: `learner-1` / `coach-1` / `admin-1` theo role. Dev mode có `<RoleSwitcher>` ở góc dưới-trái để switch nhanh.

### 4.6 Mock clock

`src/lib/mock/clock.ts` export `NOW = new Date("2026-05-22T14:20:00")` — "thời gian hiện tại" giả định cho toàn bộ mock data. Đảm bảo sessions "upcoming/today" deterministic. Không dùng `new Date()` khi so sánh với mock data.

---

## 5. Routes đã hoàn thành

### 5.1 Public / Marketing

| Route | Trạng thái | Mô tả |
|-------|-----------|-------|
| `/` | ✅ Done | Landing page — 8 scenes (hero GRIND-style, stats, AI explainer, coach showcase, coach value, mental health, CTA) |
| `/(public)/coaches` | ✅ Done | Directory tất cả coaches có filter/search |
| `/(public)/coaches/[id]` | ✅ Done | Profile coach công khai với bio, rate, reviews |
| `/(public)/ai-match` | ✅ Done | Trang giải thích AI matching |

### 5.2 Auth

| Route | Trạng thái | Mô tả |
|-------|-----------|-------|
| `/login` | ✅ Done | Form email/password, mock auth, error states |
| `/register` | ✅ Done | Đăng ký với chọn role, password strength |
| `/forgot-password` | ✅ Done | Yêu cầu reset password |
| `/reset-password` | ✅ Done | Reset với token |
| `/verify-email` | ✅ Done | Xác nhận email |
| `/api/auth/verify-email` | ✅ Done | API route xử lý email verification |

### 5.3 Learner (11 routes)

| Route | Trạng thái | Thiết kế | Mô tả |
|-------|-----------|---------|-------|
| `/learner/dashboard` | ✅ Done | Premium | Upcoming sessions, AI coach card, wellness insights |
| `/learner/coaches` | ✅ Done | Premium | Browse + search + filter coaches |
| `/learner/coaches/[id]` | ✅ Done | Premium | Coach detail, booking CTA |
| `/learner/bookings` | ✅ Done | Standard | Packages đang dùng + lịch sử |
| `/learner/ai-match` | ✅ Done | Premium | AI tool tìm coach phù hợp |
| `/learner/schedule` | ✅ Done | Premium 2-col | Calendar + AI coach sidebar + upcoming |
| `/learner/progress` | ✅ Done | Premium | Apple Fitness-style, KPI, sparklines, achievement badges |
| `/learner/plan` | ✅ Done | Standard | Training plan tuần/ngày |
| `/learner/messages` | ✅ Done | Premium | AI chat, gradient avatar, animated filter pill |
| `/learner/settings` | ✅ Done | Standard | Profile, preferences, account |
| `/learner/layout` | ✅ Done | — | AppShell wrapper |

### 5.4 Coach (11 routes)

| Route | Trạng thái | Thiết kế | Mô tả |
|-------|-----------|---------|-------|
| `/coach/dashboard` | ✅ Done | Premium 2-col | Earnings charts, active learners, revenue trends |
| `/coach/learners` | ✅ Done | Premium | Danh sách learners + booking status |
| `/coach/learners/[bookingId]` | ✅ Done | Premium | Learner profile, assessment, progress, notes |
| `/coach/session/[id]` | ✅ Done | Standard | Session detail, conduct, notes, completion |
| `/coach/packages` | ✅ Done | Standard | Quản lý training packages (CRUD) |
| `/coach/schedule` | ✅ Done | Premium | Stripe-clean time grid, session blocks, AI/today sidebar |
| `/coach/earnings` | ✅ Done | Premium | Hero earnings ($), AI insights, payout table |
| `/coach/messages` | ✅ Done | Standard | Messaging với learners |
| `/coach/media` | ✅ Done | Standard | Upload avatar/cover image |
| `/coach/profile` | ✅ Done | Premium | Profile builder, AI bio assistant, pricing intelligence |
| `/coach/preview` | ✅ Done | Standard | Preview public profile |
| `/coach/settings` | ✅ Done | Standard | Account settings |
| `/coach/layout` | ✅ Done | — | AppShell wrapper |

### 5.5 Admin (8 routes)

| Route | Trạng thái | Thiết kế | Mô tả |
|-------|-----------|---------|-------|
| `/admin/dashboard` | ✅ Done | Command center | Live telemetry, $842K KPI, DAU/Revenue/Heatmap/Retention, AI ops sidebar |
| `/admin/users` | ✅ Done | Linear/Airtable | Animated tabs, sortable, expandable rows, bulk action |
| `/admin/verifications` | ✅ Done | 3-column moderation | Queue + review + AI trust panel + keyboard shortcuts |
| `/admin/withdrawals` | ✅ Done | Finance ops | Duyệt/từ chối withdrawal requests |
| `/admin/revenue` | ✅ Done | Finance ops | KPI strip, anomaly markers, dense payout table, AI alerts |
| `/admin/ai-settings` | ✅ Done | AI Ops Control | Env switcher, signal weights, ranking simulation, governance |
| `/admin/console` | ✅ Done | Dev tool | Mock API testing console |
| `/admin/settings` | ✅ Done | Standard | Admin settings |
| `/admin/layout` | ✅ Done | — | AppShell wrapper |

### 5.6 Other

| Route | Trạng thái | Mô tả |
|-------|-----------|-------|
| `/onboarding` | ✅ Done | Coach onboarding flow (headline, rate, specialties, bio, certs) |
| `/payment/success` | ⚠️ Partial | UI done, backend verification chưa kết nối |
| `/payment/fail` | ✅ Done | Trang payment thất bại |

**Tổng: 43 routes — 41 hoàn chỉnh, 1 partial, 1 deprecated alias**

---

## 6. Components đã xây dựng

### 6.1 Layout (7)

| Component | Mô tả |
|-----------|-------|
| `AppShell` | Wrapper chính: Sidebar + TopBar + main + AskAIPanel |
| `Sidebar` | Navigation menu theo role, collapsible |
| `TopBar` | Header với search, notifications, user menu |
| `PublicNavbar` | Nav public, transparent → solid khi scroll >40px |
| `Footer` | Site footer |
| `RoleSwitcher` | Dev tool — switch role nhanh ở góc dưới-trái |
| `AskAIPanel` | Right rail chat với AI assistant |

### 6.2 Auth (8)

| Component | Mô tả |
|-----------|-------|
| `AuthBackground` | Gradient background với pastel orbs |
| `AuthBootstrap` | Init auth session khi app start |
| `AuthCard` | Card wrapper cho form |
| `AuthSwitchLink` | Link chuyển login ↔ register |
| `AuthVisualPanel` | Side panel visual branding |
| `LearnerGuard` | Route guard `/learner` (bypass trong mock) |
| `CoachGuard` | Route guard `/coach` (bypass trong mock) |
| `PasswordField` | Input password + strength indicator |

### 6.3 Common (13)

| Component | Mô tả |
|-----------|-------|
| `ClientOnly` | Wrapper SSR-safe cho Recharts và browser APIs |
| `CoachCard` | Card coach cho listings |
| `MessagesView` | Messaging UI đầy đủ (thread list + chat) |
| `StatCard` | KPI card với value, label, trend |
| `SessionRow` | Table row cho sessions |
| `BookSessionButton` | CTA đặt lịch (mock simulate / live redirect) |
| `AIBadge` | Badge AI-powered |
| `AIInsightBanner` | Banner insight từ AI |
| `AsyncStates` | LoadingState + ErrorState components |
| `ChartCard` | Wrapper card cho charts |
| `EmptyState` | Placeholder khi không có data |
| `ScrollRestoration` | Restore scroll khi navigate |
| `ScrollToTopButton` | Nút float lên đầu trang |

### 6.4 Dashboard / Visualization (4)

| Component | Mô tả |
|-----------|-------|
| `ActivityHeatmap` | Calendar heatmap theo hoạt động |
| `AICoachCard` | Card AI coach assistant với input |
| `ProgressRing` | Circular progress indicator |
| `Sparkline` | Mini inline chart (trends) |

### 6.5 Landing (18)

`HeroSection`, `StatStrip`, `HowItWorksSection`, `MatchExplainer`, `CoachShowcaseSection`, `CoachShowcaseCard`, `CoachValueSection`, `AIDeepDiveSection`, `MentalHealthSection`, `DashboardPreview`, `HeroPreview`, `FinalCTASection`, `AnimatedNumber`, `Motion`, `StaggeredMenu`, `ProductPreviewSection`, `SporticoVideoBackground`, `TestimonialsSection`

### 6.6 UI base (5)

`AuthButton`, `AuthInput`, `Checkbox`, `Divider`, `TiltedCard`

### 6.7 Chuyên biệt

| Component | Mô tả |
|-----------|-------|
| `CoachBrowser` | Search/filter coach interface với pagination |
| `PersonalProfileForm` | Form chỉnh sửa profile cá nhân |
| `WithdrawModal` | Modal request withdrawal với bank details |
| `DataViz` | Dashboard visualization helper |
| `SpotlightCard` | Interactive spotlight/hover effect |
| `MaterialIcon` | Google Material Symbols wrapper |

**Tổng: 58 components**

---

## 7. Design system

Dự án có **5 visual subsystem song song**, mỗi cái áp dụng cho nhóm routes khác nhau:

### 7a. In-app shell (legacy)
Áp dụng: các component cũ trong `learner/`, `coach/`, `admin/`
- Accent đơn: indigo `#3525cd`
- Card: `bg-surface-container-lowest` + border mỏng + `rounded-[10px]`
- Không gradient, không shadow

### 7b. Premium dashboards (chủ đạo hiện tại)
Áp dụng: hầu hết routes sau redesign
- **Gradient tiles**: indigo→violet→fuchsia / emerald / amber / rose
- **20px radius**, multi-layer shadow
- **Motion entrance** stagger (`motion/react`)
- **Lucide icons**, Sparklines trong KPI
- **`layoutId` pill** animated tabs

```ts
const ACCENTS = {
  indigo:  "from-primary to-[#7d6dff]",
  violet:  "from-[#8b5cf6] to-[#c084fc]",
  emerald: "from-[#10b981] to-[#34d399]",
  amber:   "from-[#f59e0b] to-[#fb923c]",
  rose:    "from-[#f43f5e] to-[#fb7185]",
};
```

### 7c. Finance/Ops console
Áp dụng: `admin/revenue`, `admin/ai-settings`
- Ít gradient, dày dữ liệu, radius 10–12px
- Tabular-nums, mono cho IDs
- Semantic color: green/amber/red/blue

### 7d. Auth (light premium SaaS)
Áp dụng: `/login`, `/register` và flow auth
- `bg-slate-50` + 2 pastel orbs
- Card white, 24px radius, slate-200 border
- Primary button: gradient `violet-600 → fuchsia-500`
- Trust signals: "2,000+ athletes", "SOC 2 · GDPR ready"

### 7e. Landing hero (dark immersive)
Áp dụng: Scene A của `/`
- `#0a0a0e` + `/hero.webp` parallax
- Watermark "SPORTICO™" 18vw opacity 6%
- Word cycling H1, 14 sparkle particles
- MembersCard pill góc phải dưới

---

## 8. Mock data & API layer

### 8.1 Mock data files

| File | Chứa | Số lượng |
|------|------|---------|
| `mock/users.ts` | Coaches, learners, admins với full profiles | 18 coaches, 5 learners, 3 admins |
| `mock/sessions.ts` | Scheduled/completed sessions | 12+ sessions |
| `mock/earnings.ts` | Monthly earnings + payout history | 6 tháng trend |
| `mock/messages.ts` | Message threads với chat messages | 6 threads |
| `mock/analytics.ts` | Daily active users 90 ngày | ~14k–18k/ngày (pseudo-random seeded) |
| `mock/insights.ts` | AI insights theo role | 5 insights/role |
| `mock/wellness.ts` | Learner wellness metrics | Sleep, recovery, readiness, heatmap |
| `mock/clock.ts` | Fixed NOW timestamp | `2026-05-22T14:20:00` |

### 8.2 API functions (api.ts — 47+ exports)

Toàn bộ data access đi qua `src/lib/api.ts`. Hiện tại hybrid: một số function đã kết nối backend thật, phần lớn vẫn fallback về mock.

| Nhóm | Functions |
|------|-----------|
| Users | `fetchCoaches`, `fetchCoach`, `fetchLearners`, `fetchLearner`, `fetchCurrentLearner`, `updateMyProfile`, `changePassword`, `purchasePackage` |
| Sessions | `fetchSessions`, `fetchSession`, `fetchSessionsForCoach`, `fetchSessionsForLearner`, `fetchUpcoming`, `bookSession`, `confirmSession`, `cancelSession`, `completeSession` |
| Bookings & Training | `fetchMyBookings`, `fetchCoachBookings`, `fetchBooking`, `fetchTrainingPlan`, `fetchProgressCheckIns`, `createProgressCheckIn`, `fetchAssessment`, `saveAssessment` |
| Messaging | `fetchThreads`, `fetchThread`, `fetchMessages`, `sendMessage`, `findChatRoomWith`, `createOrGetChatRoom` |
| Earnings | `fetchEarnings`, `fetchPayouts`, `fetchPendingWithdrawals`, `approveWithdrawal`, `rejectWithdrawal`, `createWithdrawal`, `fetchEarningsTotal`, `fetchPayoutAccount`, `upsertPayoutAccount` |
| Analytics | `fetchDailyActiveUsers`, `fetchProgressMetrics`, `fetchProgressTrend`, `fetchWellness`, `fetchActivityHeatmap`, `fetchInsights` |
| Notifications | `fetchNotifications`, `markNotificationRead`, `markAllNotificationsRead` |
| Verification | `fetchVerifications`, `approveVerification`, `rejectVerification` |
| Availability | `fetchMySlots`, `createSlot`, `cancelSlot`, `fetchCoachSlots` |
| Utils | `fetchSports` |

### 8.3 Backend client layer

`src/lib/backend/` là lớp type-safe cho phần đã kết nối backend:
- `client.ts` — Typed API client (Booking, Coach, Session endpoints)
- `dto.ts` — Data Transfer Objects (API response shapes)
- `endpoints.ts` — Endpoint URL constants
- `mappers.ts` — DTO → UI domain type adapters

---

## 9. State management & Auth

### 9.1 Stores

```ts
// useAppStore
{
  currentRole: "learner" | "coach" | "admin"
  currentUserId: "learner-1" | "coach-1" | "admin-1"  // TODO: real auth
  sidebarOpen: boolean
}

// useAuthStore
{
  isLoggedIn: boolean
  role: Role
  notifications: NotificationItem[]
}
```

### 9.2 Auth hiện tại (mock)

- Login form → `authApi.login()` → `setTimeout(800ms)` → fake success → localStorage token
- Guards (`LearnerGuard`, `CoachGuard`) bypass hoàn toàn trong mock mode
- Test error: `wrong@example.com` (login) / `taken@example.com` (register)

### 9.3 Auth khi có backend (cần làm)

- Thay `authApi.login()` bằng `POST /api/auth/login`
- Guards đọc token thật từ localStorage/cookie
- `useAppStore.currentUserId` lấy từ JWT payload
- Token refresh tự động khi 401 (TODO trong `auth-api.ts:171`)

---

## 10. Những gì CHƯA làm / cần hoàn thiện

### 10.1 Authentication thực sự

| Hạng mục | Trạng thái |
|----------|-----------|
| Real login/register với backend | ❌ Chưa làm — mock setTimeout |
| JWT token refresh tự động | ❌ Chưa làm — TODO trong `auth-api.ts:171` |
| Route guards thực sự | ❌ Bypass hoàn toàn trong mock mode |
| Session persistence (refresh page) | ❌ Chưa làm |
| Logout flow | ⚠️ Partial — xóa localStorage, chưa revoke server-side |

### 10.2 Backend integration còn thiếu

| Feature | Trạng thái |
|---------|-----------|
| Sports list (`GET /api/sports`) | ❌ TODO trong `sports-api.ts` |
| Real timestamps thay mock NOW (coach dashboard) | ⚠️ TODO trong `coach/dashboard/page.tsx:49` |
| Payment verification sau PayOS callback | ❌ TODO trong `payment/success` (2 TODOs) |
| Current learner từ session auth | ⚠️ Hard-code trong `learner/dashboard/page.tsx:24` và `learner/progress/page.tsx:126` |
| Basic user info update (profile preview) | ⚠️ TODO trong `coach/preview/page.tsx` |

### 10.3 Features chưa implement

| Feature | Mức độ ưu tiên | Ghi chú |
|---------|---------------|---------|
| Notification push / real-time updates | Medium | Hiện tại polling mock |
| Video call / session conduct UI | Low | `/coach/session/[id]` có form notes nhưng không có video |
| AI coaching response thực sự | Medium | `AskAIPanel` UI done, nhưng gọi mock |
| Coach onboarding → backend save | High | Form đầy đủ nhưng chưa POST |
| Review & rating system | Low | Coach card hiển thị rating nhưng không có form review |
| Search/filter backend-backed | Medium | Hiện tại filter client-side trên mock data |
| Pagination từ backend | Medium | Hiện tại load all rồi slice |
| Email notifications | Low | Verify email route có, nhưng email service chưa wired |
| Mobile responsive (fine-tuning) | Medium | Layout OK nhưng chưa test kỹ mobile |

### 10.4 Technical debt

| Issue | File | Mức độ |
|-------|------|--------|
| Nhiều pages import mock data trực tiếp (không qua `api.*`) | Nhiều pages | Medium |
| `coach/training-packages` là deprecated alias cho `coach/packages` | Route | Low |
| MaterialIcon còn rải rác trong legacy pages | Nhiều components | Low |
| `<Cell>` của Recharts deprecated trong type | Recharts usage | Low |
| `generateStaticParams` trên dynamic routes cần ISR khi có real data | `session/[id]`, `coaches/[id]` | Medium |

---

## 11. Backend integration status

Backend Azure endpoint: `https://sportico-api-khoi-g3bpg4a3dnhehng8.japaneast-01.azurewebsites.net`

Proxy local: `/api-proxy/*` → backend

### Đã kết nối (có `backend/client.ts` và mappers)

| Endpoint | Status |
|----------|--------|
| Auth (login, register, refresh) | ✅ Wired |
| Coach profile CRUD | ✅ Wired |
| Training packages CRUD | ✅ Wired |
| Bookings list + detail | ✅ Wired |
| Sessions list + detail | ✅ Wired |
| Availability slots CRUD | ✅ Wired |
| Messages / chat rooms | ✅ Wired |
| Earnings + withdrawals | ✅ Wired |
| Coach media upload (avatar/cover) | ✅ Wired |
| Payout accounts | ✅ Wired |
| Verification requests | ✅ Wired |
| Admin withdrawal management | ✅ Wired |

### Còn mock / cần kết nối

| Endpoint | Status | Ghi chú |
|----------|--------|---------|
| Sports list | ❌ Mock | TODO: `GET /api/sports` |
| AI matching | ❌ Mock | AI score tính client-side |
| Analytics / DAU | ❌ Mock | Admin dashboard dùng synthetic data |
| Progress metrics + trend | ❌ Mock | Learner progress page |
| Wellness metrics | ❌ Mock | Learner wellness |
| AI insights (per role) | ❌ Mock | `fetchInsights()` |
| Push notifications | ❌ Mock | `fetchNotifications()` |
| Payment verification callback | ❌ Partial | UI done, verification logic TODO |

---

## 12. Thống kê nhanh

| Hạng mục | Số lượng |
|----------|---------|
| Tổng routes | 43 |
| Routes hoàn chỉnh | 41 |
| Routes partial | 1 (`/payment/success`) |
| Tổng components | 58 |
| Lib files | 34 |
| Domain types | 35+ |
| Mock data files | 8 |
| API functions (`api.ts`) | 47+ |
| TODO comments còn lại | 9 |
| Dependencies (prod) | 9 |
| Lines of code (ước tính) | ~15,000+ |

---

## Quick reference

| Cần gì | Đọc ở đâu |
|--------|----------|
| Color tokens | `src/app/globals.css` → `@theme { … }` |
| Domain types | `src/types/index.ts` |
| Mock data | `src/lib/mock/` |
| API swap point | `src/lib/api.ts` |
| Backend DTOs & mappers | `src/lib/backend/` |
| Default user IDs | `learner-1`, `coach-1`, `admin-1` |
| Mock clock (NOW) | `src/lib/mock/clock.ts` |
| Design doc (legacy) | `docs/DESIGN.md` |
| API gaps tracking | `docs/frontend-api-gaps.md` |
| Home page scenes | `docs/home-page.md` |
