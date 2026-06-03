# Coach Earnings Page Redesign — Spec

**Date:** 2026-06-03  
**Scope:** `src/app/coach/earnings/page.tsx` + `src/lib/utils.ts`  
**Goal:** Fix financial hierarchy, remove fabricated math, replace all USD/English with VND/Vietnamese, expose only real backend fields.

---

## 1. Problem Summary

| Issue | Location |
|---|---|
| `formatCurrency` defaults to `en-US` / `USD` — renders `$X` for VND amounts | `utils.ts` + every call in page |
| Hero number shows `last.gross` (last monthly EarningPoint) — not wallet balance | `HeroEarnings` |
| Hard-coded fake fees: `platformFee = gross * 0.15`, `refunds = gross * 0.03` | page line ~230 |
| Expanded row fakes gross: `Math.round(p.amount / 0.85)` | `PayoutTable` line ~1392 |
| Y-axis tick formatter uses `$` prefix | Revenue chart |
| Legend labels: "Gross revenue", "Net (after fees)" in English | Revenue chart |
| Page title/subtitle fully English | Header |
| Status filter buttons show raw English status strings | Payout table |
| Date locale `en-US` in payout rows | Payout table |
| `failureReason`/`adminNote` exist in the DTO but are NOT shown | Payout table expanded row |
| "1099 & biên lai" in Quick Actions — US tax terminology | QuickActionsPanel |
| "USD" text node in hero span | `HeroEarnings` |

---

## 2. Backend Reality — Authoritative Data Map

```
CoachWalletResponse (from GET /api/coaches/me/wallet)
  totalEarned       → "Tổng thu nhập đã ghi nhận" (net credited to coach)
  availableBalance  → "Số dư có thể rút"           ← HERO NUMBER
  pendingBalance    → "Đang xử lý"
  totalWithdrawn    → "Đã rút về ngân hàng"

WithdrawalRequestResponse (from GET /api/coaches/me/withdrawal-requests)
  amount            → Số tiền yêu cầu
  status            → Trạng thái (mapped below)
  failureReason     → Lý do thất bại (show first)
  adminNote         → Ghi chú admin (fallback if failureReason missing)
  payOsReferenceId  → Mã giao dịch
  createdAt         → Ngày yêu cầu
  paidAt            → Ngày hoàn tất
  processingAt      → Ngày bắt đầu xử lý

CoachPayoutAccountResponse (from GET /api/coaches/me/payout-account)
  bankName          → Tên ngân hàng
  bankAccountNumber → Số tài khoản
  bankAccountHolder → Chủ tài khoản
  payoutMethod      → Phương thức
  status            → Trạng thái xác minh
```

**NOT available from backend (do NOT fabricate):**
- `grossRevenueVnd` — omit entirely
- `platformFeeVnd` — omit entirely
- `refundVnd` / `onHoldVnd` — omit entirely
- `nextPayoutDate` / auto-payout cycle — omit entirely
- Per-payout gross breakdown — remove from expanded row

---

## 3. VND Currency Formatter

Add to `src/lib/utils.ts`:

```ts
export function formatCurrencyVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}
```

Import in earnings page; replace every `formatCurrency(x)` call on this page with `formatCurrencyVnd(x)`.  
Do NOT modify `formatCurrency` — other pages may rely on the existing USD default.

---

## 4. Page Header

```
Title: "Thu nhập & đối soát"
Subtitle: "Theo dõi thu nhập đã ghi nhận, số dư có thể rút và lịch sử chi trả."
Badge (replace "Live financial data"): "Dữ liệu từ ví"
Date label: toLocaleDateString("vi-VN", { day: "numeric", month: "long" })
Header buttons:
  - "Xuất báo cáo" (keep Download icon)
  [Remove the fake "May 2026" period selector — no period filter backend support]
```

---

## 5. Financial Summary — Hero + 3 Support Cards

Replace `HeroEarnings` and the 4-card KPI row.

### 5a. Hero Card — "Số dư có thể rút"

```
Label:    "Số dư có thể rút"
Value:    formatCurrencyVnd(earningsTotal.available)  ← availableBalance
Helper:   "Số tiền hiện có thể rút về tài khoản ngân hàng."
Formula:  "= Tổng thu nhập đã ghi nhận - Đã rút - Đang xử lý"

Withdraw button:
  - Enabled when availableBalance > 0
  - Label: "Rút tiền"
  - Disabled state: show tooltip/text "Bạn chưa có số dư có thể rút."
  - disabled prop when availableBalance <= 0

[Remove hero chart trend — it used earnings[].gross which isn't availableBalance;
 remove deltaPct comparison — comparison period not in wallet DTO]
```

### 5b. 3 Support Cards (grid cols-3 below hero)

| Card | Value field | Label | Helper text |
|---|---|---|---|
| Indigo | `totalEarned` | Tổng thu nhập đã ghi nhận | Tổng tiền đã được ghi nhận vào ví coach sau đối soát. |
| Amber | `pendingBalance` | Đang xử lý | Các yêu cầu rút tiền đang chờ hoặc đang chuyển khoản. |
| Emerald | `totalWithdrawn` | Đã rút về ngân hàng | Tổng tiền đã chi trả thành công về tài khoản ngân hàng. |

Remove: the 4th KPI card ("Tháng này" / "Tháng trước") — it reads from `EarningPoint.gross` which is a monthly aggregation of wallet credit transactions, not the wallet balance. Without a clear gross/net distinction from the backend, these numbers are misleading when combined with a VND-correct wallet summary. Keep the monthly time-series chart (section 6) for trend context.

Sparklines in the 3 support cards: remove (they used seeded fake data). Replace each card with a clean label + value + helper text only.

---

## 6. Charts Section

### 6a. Monthly Revenue Chart

Keep the area chart, but fix:
- Y-axis tickFormatter: `(v) => \`${(v / 1_000_000).toFixed(0)}tr\`` (million VND suffix, no `$`)
- Legend: "Doanh thu gộp tháng" → label "Thu nhập ghi nhận" (the gross in EarningPoint is wallet credit sum), "Ròng" stays
- Empty state guard: if `rangedEarnings.length < 2`, hide the chart and show:
  ```
  "Chưa đủ dữ liệu để hiển thị xu hướng. Cần ít nhất 2 kỳ đối soát."
  ```
- Tooltip: format values with `formatCurrencyVnd`
- Remove the sidebar AI insight cards — they contain fake numbers ("$4,800", "62%", "28%")

### 6b. Sessions Chart

Keep the bar chart.
- Fix tooltip: remove `formatCurrency(p.gross)` line — gross is misleading here
- Y-axis already unit-less (session count) — no change needed
- Title: "Số buổi tập" (already partially correct)
- Label: "buổi trong khoảng" (instead of "total in range")

### 6c. Revenue Breakdown Donut — Replace with "Phân bổ số dư"

Replace fake `platformFee` / `refunds` donut with real wallet allocation:
```
Segments:
  - Có thể rút   = availableBalance  (color: #10b981 emerald)
  - Đang xử lý   = pendingBalance    (color: #f59e0b amber)
  - Đã rút       = totalWithdrawn    (color: #4f46e5 indigo)

Total (center label): totalEarned
Center sub-label: "Đã ghi nhận"

Legend rows: each segment with VND value
Footer: remove "Net Payout" / "Withdraw" button from this card
```

If `totalEarned === 0`: show empty state "Chưa có thu nhập được ghi nhận."

---

## 7. Payout History Table Redesign

### 7a. Columns (replace current)

| # | Header (vi) | Data source | Notes |
|---|---|---|---|
| 1 | (expand chevron) | toggle | — |
| 2 | Ngày yêu cầu | `createdAt` | `toLocaleDateString("vi-VN")` |
| 3 | Phương thức | `method` | e.g. "Chuyển khoản ngân hàng" |
| 4 | Mã giao dịch | `payOsReferenceId` ∥ `id.slice(0,8).toUpperCase()` | mono font |
| 5 | Số tiền | `amount` | `formatCurrencyVnd`, right-aligned |
| 6 | Trạng thái | `status` (mapped) | status pill |
| 7 | Ngày cập nhật | `paidAt` ∥ `updatedAt` | `toLocaleDateString("vi-VN")` |
| 8 | Hành động | receipt / external link | — |

Remove: the currency sub-label under amount (was "VND" in a separate `<p>` — now redundant since `formatCurrencyVnd` includes the ₫ symbol)

### 7b. Status Label Map (fix filter buttons too)

```ts
const STATUS_LABELS = {
  paid:       "Đã chi trả",
  pending:    "Chờ xử lý",
  approved:   "Đã duyệt",
  processing: "Đang chuyển khoản",
  failed:     "Thất bại",
  rejected:   "Đã từ chối",
};
```

Status filter pills: replace raw English keys with these Vietnamese labels.

### 7c. Expanded Row — Remove Fake Math, Add Failure Reason

**Remove entirely:**
- "Doanh thu gộp" = `Math.round(p.amount / 0.85)` — fabricated
- "Phí nền tảng" = fake 15% — fabricated
- "Chi trả ròng" = same as amount — redundant
- "Quyết toán" = `date + 3 days` — fabricated

**Replace with real data:**
```
Ngày yêu cầu:    createdAt
Ngày xử lý:      processingAt (if available)
Ngày hoàn tất:   paidAt (if available)
Mã PayOS:        payOsPayoutId (if available)
Mã tham chiếu:   payOsReferenceId (if available)

For status === "failed" or "rejected":
  Lý do thất bại: failureReason ?? adminNote ?? "Chưa có lý do cụ thể."
  Show in red/warning surface.

Actions row:
  - "Tải biên nhận" (if paid)
  - Remove "Gửi email" (no backend action)
```

### 7d. Empty / Filter States

- No results: "Không có giao dịch nào khớp."
- All clear: "Chưa có lịch sử rút tiền."

---

## 8. Bank / Payout Account Block

Replace `QuickActionsPanel`. Add a dedicated `PayoutAccountCard` using real `CoachPayoutAccountResponse`.

```
Title: "Tài khoản nhận tiền"

If payout account exists:
  - Ngân hàng:        bankName
  - Số tài khoản:     bankAccountNumber (last 4 digits masked: ****XXXX)
  - Chủ tài khoản:    bankAccountHolder
  - Trạng thái:       status pill (Đã xác minh / Chờ xác minh / Chưa xác minh)
  - Action: "Cập nhật tài khoản" → /coach/settings or withdraw modal

If no payout account:
  - "Bạn chưa liên kết tài khoản ngân hàng."
  - CTA: "Thêm tài khoản ngân hàng"

Do NOT show:
  - Auto-payout enabled/disabled (no backend field)
  - Next payout date (no backend field)
  - Payout cycle (no backend field)
```

Below the bank block: compact "Thao tác nhanh" with 3 actions:
- Rút tiền (onWithdraw)
- Xuất CSV (placeholder)
- Xem chính sách phí (link placeholder)

Remove: "Hồ sơ thuế / 1099" — US terminology, not applicable to Vietnam.

---

## 9. Data Fetch Changes

Add `api.fetchPayoutAccount()` to the parallel fetch in `CoachEarningsPage`:

```ts
const { data, ... } = useApiResource(
  () => Promise.all([
    api.fetchEarnings(),
    api.fetchPayouts(),
    api.fetchEarningsTotal(),
    api.fetchPayoutAccount(),   // ← ADD
  ]),
  [],
);
const payoutAccount = data?.[3] ?? null;
```

`api.fetchPayoutAccount` already exists — check `src/lib/api.ts`.

---

## 10. TODO Comments for Backend

Add at top of the page file:

```ts
// TODO: Backend should expose a GET /api/coaches/me/revenue-summary endpoint with:
// {
//   period: string,            // e.g. "2026-06"
//   grossRevenueVnd: number,   // total booking amounts before platform fee
//   platformFeeVnd: number,    // Sportico commission deducted
//   refundVnd: number,         // amounts refunded to learners
//   netRevenueVnd: number,     // = grossRevenue - platformFee - refund
//   totalWithdrawnVnd: number, // already in CoachWalletResponse
//   pendingPayoutVnd: number,  // already in CoachWalletResponse
//   availableBalanceVnd: number,// already in CoachWalletResponse
//   onHoldVnd: number,         // for dispute/refund window holds (not yet tracked)
// }
// Until then: display only CoachWalletResponse fields (totalEarned, availableBalance,
// pendingBalance, totalWithdrawn) and omit gross/fee/refund rows from the UI.
```

---

## 11. Files Changed

| File | Change |
|---|---|
| `src/lib/utils.ts` | Add `formatCurrencyVnd` export |
| `src/app/coach/earnings/page.tsx` | Full refactor per sections 4–9 above |

No new files, no new routes, no backend changes required.

---

## 12. Validation Checklist

- [ ] No `$` character appears anywhere on the page
- [ ] No `"USD"` string appears anywhere on the page
- [ ] `formatCurrency` (old) is not called on this page
- [ ] `formatCurrencyVnd` used for all money values
- [ ] `platformFee = gross * 0.15` removed
- [ ] `refunds = gross * 0.03` removed
- [ ] `Math.round(p.amount / 0.85)` fake gross removed from expanded row
- [ ] Hero number is `availableBalance`
- [ ] Withdraw button disabled when `availableBalance <= 0`
- [ ] Failed payout shows `failureReason ?? adminNote ?? fallback`
- [ ] Payout table dates use `vi-VN` locale
- [ ] Chart Y-axis shows `tr` (triệu) suffix, not `$`
- [ ] AI insight cards with fake numbers removed
- [ ] "1099" removed from Quick Actions
- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
