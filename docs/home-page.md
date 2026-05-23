# Home Page — Nội dung & Scene Breakdown

> File: `src/app/(public)/page.tsx`
> Route: `/`
> Mô tả cấu trúc nội dung trang chủ Sportico, chia theo từng scene (A → H). Dùng làm reference cho design, copywriting, marketing và localization.

---

## Tổng quan kiến trúc

Trang chủ là **landing page** giới thiệu sản phẩm "AI-powered coach matching marketplace". Cấu trúc được chia thành **8 scene** xếp dọc theo thứ tự câu chuyện:

| # | Scene | Mục đích | Background |
|---|---|---|---|
| A | Hero | Hook + giá trị cốt lõi + CTA chính | Sáng + grid mờ + glow indigo/violet |
| B | Stat strip | Tạo niềm tin bằng số liệu | Sáng (`surface`), border trên/dưới |
| C | How it works | Giải thích flow 3 bước | Sáng (`surface-container-lowest`) |
| D | AI deep-dive | Show off intelligence engine | **Tối** (`#0b0a1e`) |
| E | Coach showcase | Chứng minh chất lượng marketplace | Sáng |
| F | Product preview | Tính năng dashboard | Sáng (`surface`) |
| G | Testimonials | Social proof có metric | Sáng |
| H | Final CTA | Conversion cuối | Gradient indigo → violet đậm |

**Pattern thị giác:** sáng → sáng → tối → sáng → … → gradient. Đảo sáng/tối để tạo nhịp.

---

## Scene A — Hero

**Vai trò:** Câu mở đầu — phải nói rõ sản phẩm là gì, dành cho ai, trong 3 giây.

### Layout
- 2 cột (`grid-cols-[1.05fr_0.95fr]` ở desktop), 1 cột mobile.
- Cột trái: copy + CTA + social proof.
- Cột phải: `<HeroPreview />` (mock coach card preview).

### Nội dung

**AI badge (eyebrow):**
```
AI-Powered Coach Matching
```

**Headline (H1, 60px desktop):**
```
Train smarter with AI-matched coaches.
```
> "AI-matched coaches" gradient indigo → violet.

**Sub-headline:**
```
Stop scrolling endless directories. ProCoach AI reads your goals,
schedule and training style — then matches you with the elite coach
most likely to get you there.
```

**CTAs:**
- Primary: `Find your coach` → `/learner/coaches` (icon: search)
- Secondary text link: `Become a coach` → `/coach/dashboard`

**Social proof row:**
- Avatar stack (4 athletes) + `2,000+ athletes matched this season`
- 5 sao vàng + `4.9 average rating`

### Visual elements
- Grid texture mờ (`.bg-grid-faint`) masked radial.
- 2 glow blob: indigo trái-trên, violet phải-trên.
- HeroPreview cột phải (component riêng).

---

## Scene B — Stat strip

**Vai trò:** Củng cố niềm tin ngay sau hero bằng số liệu cứng.

### Layout
- Strip ngang, border-y, grid 4 cột (2 cột mobile).
- Animated counter (`<AnimatedNumber />`) chạy khi vào viewport.

### Nội dung — 4 chỉ số

| Số | Hậu tố | Nhãn |
|---|---|---|
| 1,200 | + | Verified elite coaches |
| 25 | k+ | Athletes coached since 2021 |
| 94 | % | AI match accuracy |
| 4.9 | /5 | Average coach rating |

### Visual
- Mỗi item có border-left ngăn cách (desktop).
- Font 34px, weight 600, letter-spacing tight.

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
| Animated number | `<AnimatedNumber>` | Đếm lên từ 0 đến giá trị cuối |

Tất cả respect `prefers-reduced-motion` — tắt animation nếu người dùng yêu cầu.

---

## Component dependencies

| Component | Dùng ở Scene | File |
|---|---|---|
| `HeroPreview` | A | `src/components/landing/HeroPreview.tsx` |
| `AnimatedNumber` | B | `src/components/landing/AnimatedNumber.tsx` |
| `MatchExplainer` | D | `src/components/landing/MatchExplainer.tsx` |
| `CoachShowcaseCard` | E | `src/components/landing/CoachShowcaseCard.tsx` |
| `DashboardPreview` | F | `src/components/landing/DashboardPreview.tsx` |
| `Reveal`, `RevealStagger`, `RevealItem` | All | `src/components/landing/Motion.tsx` |
| `AIBadge` | A | `src/components/common/AIBadge.tsx` |
| `MaterialIcon` | All | `src/components/icons/MaterialIcon.tsx` |
| `Eyebrow` (local) | C, E, F, G | Inline trong `page.tsx` |

---

## Copy guidelines

- **Tone:** Confident, calm, smart. Không hype, không khoa trương.
- **Verb tense:** Present, active ("matches", "scores", "learns").
- **Số liệu:** Luôn cụ thể (`94%`, `0.8s`, `−90s`), không vague.
- **Tránh:** "Game-changing", "revolutionary", "best-in-class" — sáo rỗng.
- **Ưu tiên:** Outcome-driven ("Your next breakthrough", "−90s 5K time").

---

## Checklist khi cập nhật nội dung

- [ ] Cập nhật `STATS` nếu số liệu thay đổi
- [ ] Cập nhật `STEPS` nếu thay đổi onboarding flow
- [ ] Cập nhật `AI_SIGNALS` nếu thuật toán matching đổi
- [ ] Refresh `TESTIMONIALS` mỗi quý với learner mới
- [ ] Kiểm tra link `/coach/dashboard`, `/learner/coaches`, `/learner/dashboard` còn đúng
- [ ] Test responsive ở 360px, 768px, 1024px, 1440px
- [ ] Kiểm tra `prefers-reduced-motion` — tắt animation đúng cách
