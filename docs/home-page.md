# Home Page — Nội dung & Scene Breakdown

> File: `src/app/(public)/page.tsx`
> Route: `/`
> Mô tả cấu trúc nội dung trang chủ Sportico, chia theo từng scene (A → H). Dùng làm reference cho design, copywriting, marketing và localization.

---

## Tổng quan kiến trúc

Trang chủ là **landing page** giới thiệu sản phẩm "AI-powered coach matching marketplace". Cấu trúc được chia thành **8 scene** xếp dọc theo thứ tự câu chuyện:

| # | Scene | Mục đích | Background |
|---|---|---|---|
| A | Hero | Hook visual mạnh + giá trị cốt lõi | **Tối** — full-bleed ảnh `/hero.webp` + overlay dark gradient (GRIND-style) |
| B | Trust strip | Social proof + AI accuracy focal | Sáng (white) + 3 soft radial glow violet/cyan/fuchsia, không grid |
| C | How it works | Giải thích flow 3 bước | Sáng (`surface-container-lowest`) |
| D | AI deep-dive | Show off intelligence engine | **Tối** (`#0b0a1e`) |
| E | Coach showcase | Chứng minh chất lượng marketplace | Sáng |
| F | Product preview | Tính năng dashboard | Sáng (`surface`) |
| G | Testimonials | Social proof có metric | Sáng |
| H | Final CTA | Conversion cuối | Gradient indigo → violet đậm |

**Pattern thị giác:** **TỐI** → sáng → sáng → **TỐI** → sáng → sáng → sáng → **GRADIENT**. Đảo sáng/tối để tạo nhịp; mở đầu bằng dark immersive hero để tạo ấn tượng mạnh tức thì.

---

## Scene A — Hero (GRIND-style dark immersive)

**File:** [src/components/landing/HeroSection.tsx](../src/components/landing/HeroSection.tsx)

**Vai trò:** Hook hình ảnh + brand mood mạnh trong 2 giây đầu. Không phải nơi giải thích product — chỉ để gây ấn tượng cảm xúc và push scroll xuống Scene B.

### Layout

- **Full-bleed**: `h-[min(100vh,860px)]` với `-mt-16` để chui dưới `PublicNavbar` (navbar tự đổi `transparent` → `solid` khi scroll > 40px).
- Nội dung text căn trái trong `max-w-7xl` container, không có cột phải (không còn HeroPreview như version cũ).
- Mobile + desktop dùng cùng layout (không split 2-column nữa).

### Nội dung

**Pulsing badge (eyebrow):**
```
● Live · AI-matched coaching   ✦
```
- Chấm xanh emerald `animate-ping`, sparkles icon violet, pill border `border-white/20` + bg `white/[0.06]`.

**Headline (H1, 62–78px, uppercase font-black 2 dòng):**
```
COMMUNITY FIRST.
{cycling word}
```
**Word cycling** ở dòng 2 — đổi mỗi 3s với blur-y fade qua `AnimatePresence`:
1. `MENTAAL & FYSIEK`
2. `FOCUS & FORM`
3. `STRENGTH & FLOW`

Mỗi word có gradient trắng → tím → trắng chạy ngang (`animate-gradient-x` 200% bg).

**Sub copy ngắn (max-w-md):**
```
AI-matched elite coaches, a community that holds you accountable,
and one calm place to grow mentally and physically.
```

**Bottom-right corner — Members card pill** (`<MembersCard />`):
- 3 avatar stack stagger scale-in.
- CountUp `0 → 2,000+` trong 1.4s.
- Featured coach avatar với ring violet + glow.
- Pill bg `black/35`, backdrop-blur, rounded-full.

### Visual & motion

**Background image (parallax):**
- `/hero.webp` (copy từ `assets/mainimg.webp` qua Bash sang `public/`).
- `object-cover object-[center_20%]` để focus vào mặt model.
- Mouse parallax: ảnh drift ngược chiều ±20px theo cursor (spring damping 20).

**Overlay layers (theo thứ tự z):**
1. Gradient trái → phải: `from-black/85 via-black/45 to-black/20` (cho text đọc rõ phía trái).
2. Gradient top dark `from-black/70 to-transparent` h-40 (cho navbar).
3. Gradient bottom dark `from-black to-transparent` h-72 (cho watermark + members card).
4. Grid dark texture `opacity-30`.
5. 14 **sparkle particles** trắng deterministic (SSR-safe), fade in/out + bay lên 30px, chu kỳ 5–10s.
6. **Glow blobs**:
   - Indigo `bg-indigo-600/30 blur-[140px]` ở `bottom-left` — pulse opacity 0.35 ↔ 0.55, scale 1 ↔ 1.1, 9s.
   - Violet `bg-violet-600/25 blur-[130px]` ở `top-right` — pulse opacity 0.25 ↔ 0.5, 11s.

**Brand watermark (giant bg text):**
- `SPORTICO™` font-black 18vw, opacity 6%, `WebkitTextStroke 1px white/12`.
- Parallax ngược chiều watermark (drift +30px).
- Fade-up entrance delay 0.3s.

**Scroll cue:**
- Bottom-right corner, "SCROLL" uppercase 10px tracking-0.22em + arrow trượt lên xuống vô hạn (1.6s).

### Files

- Hero section: [src/components/landing/HeroSection.tsx](../src/components/landing/HeroSection.tsx)
- Ảnh: [public/hero.webp](../public/hero.webp)
- PublicNavbar `variant="transparent"` set trong [src/app/(public)/layout.tsx](../src/app/(public)/layout.tsx).

---

## Scene B — Trust strip (asymmetric premium)

**File:** [src/components/landing/StatStrip.tsx](../src/components/landing/StatStrip.tsx)

**Vai trò:** Củng cố niềm tin ngay sau hero. Không còn là "4 ô số đều nhau" — giờ có **focal point AI engine 94%** + 3 stat phụ + eyebrow trust + testimonial proof. Kể câu chuyện theo flow: trust → AI → marketplace → proof.

### Layout — Asymmetric 60/40

```
┌─────────────────────────────────────────────────────────┐
│  [avatar stack] Trusted by 25,000+ athletes from 60+ countries │ ← eyebrow
│                                                          │
│  ┌──────────────────┐   ┌─────────────────────────┐     │
│  │ FEATURED          │   │ ─ 1,200+ Coaches        │     │
│  │ AI Engine badge   │   ├─────────────────────────┤     │
│  │ 94%               │   │ ─ 25k+ Athletes         │     │
│  │ + sparkline       │   ├─────────────────────────┤     │
│  │ + insight chip    │   │ ─ 4.9★ Rating           │     │
│  └──────────────────┘   └─────────────────────────┘     │
│                                                          │
│  [avatar] "I cut 90 seconds off my 5K." — Mia Carter     │ ← testimonial
└─────────────────────────────────────────────────────────┘
```

- Container: `max-w-6xl` (không 7xl để đỡ stretch).
- Padding: `py-20 sm:py-24`.
- Grid: `lg:grid-cols-[1.15fr_1fr]` desktop, stack mobile.
- Featured card chiếm bên trái, 3 supporting stacked phải.

### Nội dung

**Eyebrow trust row:**
```
[4 avatars] Trusted by 25,000+ athletes from 60+ countries
```
Số được bold `tabular-nums` text-slate-900.

**Featured card (focal):**
- Badge: `✦ AI ENGINE` (violet pill border + bg `violet-50`).
- Subtitle: `Match accuracy · last 8 weeks`.
- **Massive number**: `94%` (64–80px, font-weight 600, tracking `-0.04em`, dùng `ss01` font feature).
- Body: `AI matching accuracy improving weekly — based on confirmed booking outcomes.`
- **Sparkline** 220×56: data `[78, 81, 83, 85, 88, 90, 92, 94]`, path draw 1.2s, area fill gradient violet 0.18 → 0, end-point dot scale-in.
- **Delta chip**: `▲ +16 pts` (emerald-50 bg, border emerald-200).
- **Footer insight box**: bg `slate-50/70`, icon Sparkles violet trong tile trắng + "Every match sharpens the next recommendation."

**Supporting cards (3 stacked rows):**

| Icon | Số | Label | Hint |
|---|---|---|---|
| ShieldCheck | `1,200+` | Verified elite coaches | Across 13 sport disciplines |
| Users | `25k+` | Athletes coached since 2021 | Across 6 continents |
| Star | `4.9/5` + ★★★★★ | Average coach rating | From 18,420+ verified reviews |

Mỗi card:
- Icon tile **unified**: `bg-slate-50` + `text-violet-600`, hover → `bg-violet-50` + `text-violet-700`. **Bỏ 4 màu rực rỡ cũ**.
- Số 30–34px tabular-nums, suffix (`+`, `k+`, `/5`) màu `slate-400`.
- Label 13.5px slate-700, hint 12px slate-500.

**Testimonial footer:**
```
[avatar Mia] "I cut 90 seconds off my 5K in two months." — Mia Carter, 5K runner
```
Quote text-slate-900, attribution text-slate-500. Center alignment.

### Visual & motion

**Background:**
- White bg + 3 soft radial glow:
  - Violet `rgba(124,58,237,0.06)` top-left
  - Cyan `rgba(6,182,212,0.05)` bottom-right
  - Fuchsia `rgba(236,72,153,0.03)` center
- **Không còn grid, không sparkle particles, không border-y dày**. Chỉ `border-t border-slate-200/70` trên cùng.

**Card design:**
- Featured: white, slate-200 border, radius 24px, shadow 2-layer `0_1px_3px` + `0_18px_40px_-20px_rgba(15,23,42,0.12)`. Hover lift `-3px` + shadow tone-shift violet `0_28px_56px_-20px_rgba(124,58,237,0.18)`. Corner blob violet → fuchsia opacity 70 → 100.
- Supporting: white, slate-200 border, radius 20px, soft shadow. Hover lift `-2px` + border slate-300 + shadow tăng. Icon tile transition `bg-slate-50 → bg-violet-50` (300ms).

**Motion entrance (in-view trigger):**
- Eyebrow row: fade-up 0.55s (avatars stagger 50ms).
- Featured card: fade-up 0.7s, delay 0.15s.
- Supporting cards: fade-from-right 0.55s, stagger 80ms (0.32 / 0.4 / 0.48).
- **CountUp**: 1.6s ease custom `[0.16, 1, 0.3, 1]`.
- **Sparkline**: path draw 1.2s (delay 0.55), area fade 0.8s (delay 0.8), end-point dot 0.35s (delay 1.7).
- **Mini stars** (4.9): scale-in stagger 60ms (delay 0.7 base).
- **Testimonial**: fade-up cuối (delay 0.65).
- Tất cả respect `useReducedMotion()`.

---

## Scene C — How it works

**Vai trò:** Trả lời câu "vậy nó hoạt động thế nào?" trong 3 bước đơn giản.

### Layout
- Title centered + 3 card ngang.
- Đường nối dotted ngang giữa các step number ở desktop.

### Heading
- **Eyebrow:** `How it works`
- **H2:** `From goal to first session in three steps`
- **Lead:** `No cold outreach. No guesswork. Just an intelligent path from where you are to where you want to be.`

### 3 bước

**Step 01 — Share your ambition**
- Icon: `flag`
- *Tell us your sport, your goal and how you like to train. A focused 60-second profile — no endless forms.*

**Step 02 — AI finds your match** ⭐ (highlight)
- Icon: `auto_awesome`
- *Our engine scores every coach against your goals, schedule and style — and shows you exactly why each one fits.*
- Badge gắn dưới: `⚡ Avg. match in 0.8s`

**Step 03 — Train, measure, repeat**
- Icon: `trending_up`
- *Book in a tap, then watch every metric move on one intelligent dashboard that learns as you go.*

### Visual
- Step number to (`68px`, opacity 4%) ở góc phải mỗi card.
- Step 02 dùng border + bg primary tint, icon gradient indigo → violet.

---

## Scene D — AI deep-dive (Dark)

**Vai trò:** "Show, don't tell" — chứng minh AI thật sự thông minh, không phải marketing.

### Layout
- **Nền tối** `#0b0a1e` (đảo theme).
- 2 cột: copy trái, `<MatchExplainer />` phải.

### Heading
- **Eyebrow (chấm indigo):** `The matching engine`
- **H2 (white):** `Matching intelligence,\nnot just another filter.`
- **Lead (white/60):** `Most marketplaces stop at a search bar. ProCoach AI weighs four live signals on every coach — and shows you the reasoning behind the score.`

### 4 AI Signals (grid 2×2)

**1. Goal-weighted ranking** — icon `target`
> Coaches are scored on your specific outcome — not just a sport category.

**2. Schedule-aware matching** — icon `event_available`
> Only surfaces coaches with real open slots that fit how your week looks.

**3. Style calibration** — icon `tune`
> Learns whether you want tough love or patient guidance, then matches for it.

**4. Closed feedback loop** — icon `insights`
> Every session result sharpens the model's next recommendation for you.

### Visual
- Grid dark texture + 2 glow blob indigo/violet.
- Card signal: border `white/10`, bg `white/[0.03]`, icon tile indigo tint.

---

## Scene E — Coach showcase

**Vai trò:** Chứng minh chất lượng marketplace — coaches có thật, đã verify.

### Layout
- Header 2 cột (title trái, CTA "Browse all" phải).
- Grid 3 coach card (`<CoachShowcaseCard />`).

### Heading
- **Eyebrow:** `The marketplace`
- **H2:** `Coaches worth training with`
- **Lead:** `Every profile is identity-verified and credential-checked before it goes live — across 13 disciplines.`

**Link:** `Browse all coaches →` (`/learner/coaches`)

### Coach data
- Lấy từ `getCoaches()` — 3 coach đầu tiên (index 0, 2, 4).
- Mỗi card render bởi component `CoachShowcaseCard`.

---

## Scene F — Product preview

**Vai trò:** Cho thấy dashboard thật — không phải lời hứa.

### Layout
- 2 cột (`grid-cols-[0.92fr_1.08fr]`), copy trái, `<DashboardPreview />` phải.

### Heading
- **Eyebrow:** `Inside the product`
- **H2:** `Every session, measured and understood`
- **Lead:** `Your dashboard turns training into signal. Track fitness trends, streaks and recovery — and let AI flag what to adjust before it costs you progress.`

### Feature list (check bullets)
1. Composite fitness score across mobility, strength & conditioning
2. AI recovery alerts from heart-rate variability trends
3. One calm view for sessions, messages and progress

**Link:** `Explore the dashboard →` (`/learner/dashboard`)

### Visual
- Section background `surface` (xám nhẹ) thay vì `surface-container-lowest` để tạo nhịp.
- Bullet check icon trong tròn primary tint.

---

## Scene G — Testimonials

**Vai trò:** Social proof — nhưng phải có **metric thật**, không chỉ "I love it".

### Layout
- Title centered + 3 testimonial cards.

### Heading
- **Eyebrow:** `Proof, not promises`
- **H2:** `Athletes who trained with intent`
- **Lead:** `Real results from learners across the platform — measured, not imagined.`

### 3 testimonials

**Mia Carter — 5K competitor**
- Metric: **−90s** (5K time)
- *"The match nailed it on the first try. I've cut 90 seconds off my 5K in two months — and I actually look forward to every session now."*

**Alex Rivera — Marathon runner**
- Metric: **+24h** (trained)
- *"My coach understood my mobility goals before our first call. Booking, plans and progress finally all live in one calm place."*

**Daniel Wong — Amateur boxer**
- Metric: **4.9★** (coach rating)
- *"I tried three platforms before this. The coach quality and the accuracy of the AI match are simply on another level."*

### Card structure
- Top row: 5 sao vàng + metric pill (primary tint).
- Quote chính giữa.
- Bottom: avatar + tên + role.

---

## Scene H — Final CTA

**Vai trò:** Conversion cuối — cần đẩy mạnh hành động.

### Layout
- 1 khối lớn rounded-28px, gradient indigo → violet, padding ~80px.
- Center alignment.

### Nội dung

**Badge (white pill):**
```
✨ START FREE TODAY
```

**H2 (48px, white):**
```
Your next breakthrough is one match away.
```

**Lead (white/75):**
```
Join thousands of athletes training with AI-matched elite coaches.
No credit card required to start.
```

**CTAs:**
- Primary (white bg): `🚀 Get started free` → `/learner/dashboard`
- Secondary (border white): `Browse coaches` → `/learner/coaches`

**Footer link (white/70):**
```
Are you a coach? Grow your practice with AI-filled slots → /coach/dashboard
```

### Visual
- Gradient bg: `linear-gradient(135deg, #3525cd 0%, #4f46e5 52%, #7c3aed 100%)`
- Dark grid texture overlay (opacity 60%).
- 2 glow blob mờ trắng + violet.

---

## Motion & Animation rules

| Pattern | Component | Mô tả |
|---|---|---|
| Fade-up khi vào viewport | `<Reveal>` | `y: 28 → 0`, `opacity: 0 → 1`, ease custom |
| Stagger children | `<RevealStagger>` + `<RevealItem>` | Stagger 0.09s mỗi item |
| Word cycling (Scene A) | `AnimatePresence` + `motion.span` | Blur-y fade swap mỗi 3s |
| Mouse parallax (Scene A) | `useMotionValue` + `useSpring` | Drift ±20–30px theo cursor |
| Count-up (Scene A, B) | `animate()` từ `motion/react` | 0 → value, ease custom 1.4–1.8s |
| SVG path draw (Scene B) | `motion.path` + `pathLength` | 1.2s ease, dùng cho sparkline |
| In-view trigger (Scene B) | `useInView({ once: true })` | Một lần khi scroll vào |

Tất cả respect `prefers-reduced-motion` — tắt animation nếu người dùng yêu cầu.

### Custom keyframes (trong `globals.css`)

| Class | Mô tả | Dùng ở |
|---|---|---|
| `.animate-gradient-x` | Gradient ngang chạy 200% bg 6s ease-in-out | Scene A headline cycling word |
| `.animate-shimmer` | Diagonal sheen 2.6s linear | CTA / progress bars |
| `.animate-pulse-slow` | Opacity + scale 3.6s | Halo / ambient |
| `.animate-float-y` | Bay lên xuống 16px 7s | Floating chips |
| `.animate-float-y-slow` | Bay 11s | Slower float variant |
| `.animate-dot-flash` | Dot fade-pulse 1.3s | Typing indicator |
| `.animate-rise-in` | Card entrance | Marketplace grid |
| `.bg-grid-dark` | Dark grid texture lines | Scene A overlay (opacity 30%) |
| `.bg-grid-faint` | Light grid texture | (deprecated cho Scene A — vẫn dùng nơi khác) |

---

## Component dependencies

| Component | Dùng ở Scene | File |
|---|---|---|
| `HeroSection` | A | [`src/components/landing/HeroSection.tsx`](../src/components/landing/HeroSection.tsx) |
| `HeroPreview` | — *(legacy, không còn render trong Scene A mới; vẫn export để reuse)* | [`src/components/landing/HeroPreview.tsx`](../src/components/landing/HeroPreview.tsx) |
| `StatStrip` | B | [`src/components/landing/StatStrip.tsx`](../src/components/landing/StatStrip.tsx) |
| `AnimatedNumber` | — *(không còn dùng ở Scene B mới — Scene B có `CountUp` nội bộ. Vẫn export để reuse.)* | [`src/components/landing/AnimatedNumber.tsx`](../src/components/landing/AnimatedNumber.tsx) |
| `MatchExplainer` | D | [`src/components/landing/MatchExplainer.tsx`](../src/components/landing/MatchExplainer.tsx) |
| `CoachShowcaseCard` | E | [`src/components/landing/CoachShowcaseCard.tsx`](../src/components/landing/CoachShowcaseCard.tsx) |
| `DashboardPreview` | F | [`src/components/landing/DashboardPreview.tsx`](../src/components/landing/DashboardPreview.tsx) |
| `Reveal`, `RevealStagger`, `RevealItem` | C, E, F, G, H | [`src/components/landing/Motion.tsx`](../src/components/landing/Motion.tsx) |
| `AIBadge` | — *(legacy, Scene A mới dùng custom PulsingBadge inline)* | [`src/components/common/AIBadge.tsx`](../src/components/common/AIBadge.tsx) |
| `MaterialIcon` | C, D, F, G, H | [`src/components/icons/MaterialIcon.tsx`](../src/components/icons/MaterialIcon.tsx) |
| `lucide-react` icons | A, B | Trực tiếp từ `lucide-react` package |
| `Eyebrow` (local) | C, E, F, G | Inline trong `page.tsx` |

### Sub-components nội bộ

**Trong `HeroSection.tsx`:**
- `PulsingBadge` — top eyebrow với chấm xanh ping
- `MembersCard` — pill avatar stack + count-up góc dưới phải
- `CountUp` — counter helper
- `ScrollCue` — "SCROLL" + arrow dưới
- `FadeUp` — wrapper fade-up tránh dùng Reveal (Reveal là server-side wrapper)

**Trong `StatStrip.tsx`:**
- `FeaturedStat` — featured card với badge + 94% + sparkline + insight
- `SupportingStat` — 1 row supporting với icon + count + label + hint
- `CountUp` — counter helper
- `Sparkline` — SVG animated path + gradient fill + end-point dot
- `MiniStars` — 5 sao stagger scale-in

---

## Copy guidelines

- **Tone:** Confident, calm, smart. Không hype, không khoa trương.
- **Verb tense:** Present, active ("matches", "scores", "learns").
- **Số liệu:** Luôn cụ thể (`94%`, `0.8s`, `−90s`), không vague.
- **Tránh:** "Game-changing", "revolutionary", "best-in-class" — sáo rỗng.
- **Ưu tiên:** Outcome-driven ("Your next breakthrough", "−90s 5K time").
- **Scene A đặc thù**: uppercase, font-black, ngắn gọn — copy như tagline brand chứ không phải product description.
- **Scene B đặc thù**: số phải đi kèm 1 hint cụ thể (vd "Across 13 sport disciplines") — tránh bare numbers.

---

## Checklist khi cập nhật nội dung

- [ ] Scene A — đổi `CYCLE_WORDS` trong [HeroSection.tsx](../src/components/landing/HeroSection.tsx) nếu đổi tagline.
- [ ] Scene A — replace `/hero.webp` với ảnh brand mới (giữ `object-position` phù hợp).
- [ ] Scene B — đổi 4 số (1200, 25, 94, 4.9) trong `STATS` array của [StatStrip.tsx](../src/components/landing/StatStrip.tsx).
- [ ] Scene B — refresh `ACCURACY_TREND` sparkline data nếu accuracy thay đổi nhiều.
- [ ] Scene B — đổi hints (`Across 13 sport disciplines`, `Across 6 continents`, `From 18,420+ verified reviews`).
- [ ] Cập nhật `STEPS` nếu thay đổi onboarding flow (Scene C).
- [ ] Cập nhật `AI_SIGNALS` nếu thuật toán matching đổi (Scene D).
- [ ] Refresh `TESTIMONIALS` mỗi quý với learner mới (Scene G).
- [ ] Kiểm tra link `/coach/dashboard`, `/learner/coaches`, `/learner/dashboard` còn đúng.
- [ ] Test responsive ở 360px, 768px, 1024px, 1440px (đặc biệt Scene A full-bleed image — kiểm tra `object-position`).
- [ ] Kiểm tra `prefers-reduced-motion` — tắt animation đúng cách.
- [ ] Lint + type-check: `npx eslint <files>` + `npx tsc --noEmit`.
