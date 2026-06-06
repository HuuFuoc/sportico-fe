# Coach Onboarding Redesign — Design Spec

**Date:** 2026-06-06
**Page:** `src/app/onboarding/page.tsx` ("Trở thành huấn luyện viên")
**Chosen layout:** Option A — 2-column (form left + live preview/checklist sidebar right)

---

## 1. Goal

Nâng cấp trang onboarding từ single-column form thành 2-column layout có **live profile preview**, để người dùng nhìn thấy hồ sơ HLV của mình hình thành ngay khi điền form → tăng completion rate. Không thay đổi API, route guard, auth, hay business logic.

## 2. Hard constraints (từ brief + CLAUDE.md)

- **Không thay đổi** `registerCoachAndElevate()`, `getSports()`, hay luồng route guard / auth.
- **Không fake data**: không fake rating, fake số học viên, fake doanh thu, fake analytics. Preview chỉ dùng dữ liệu thật:
  - `user.fullName`, `user.avatarUrl` từ `useAuthStore`
  - form state hiện tại (headline, experienceYears, bio, sportIds)
  - sports hardcoded từ `getSports()` (`STABLE_SPORTS`)
- **Không hotlink external images** — avatar lấy từ `user.avatarUrl` (do user upload qua S3) hoặc fallback `initials()`.
- Giữ nguyên validation hiện tại và message tiếng Việt qua `messageForApiError()`.
- Sau khi sửa: `npx tsc --noEmit && pnpm lint && pnpm build` phải sạch.

## 3. Existing behavior to preserve

Từ `src/app/onboarding/page.tsx` hiện tại:

| Concern | Giữ nguyên |
|---|---|
| Data fetch | `useApiResource(() => getSports(), [])` |
| Submit | `registerCoachAndElevate({ headline, bio, experienceYears, sportIds })` |
| Success | `setSuccess(true)` → `setTimeout(() => router.replace("/coach/profile"), 900)` |
| Needs-relogin | `setError(RELOGIN_MESSAGE)` → `setTimeout(() => router.replace("/login"), 2600)` |
| Error | `setError(messageForApiError(e))` |
| Validation | `headline.trim().length >= 5`; `experienceYears !== "" && 0 ≤ n ≤ 60`; sportIds optional |
| Input caps | headline slice 255; bio slice 2000 |
| `canSubmit` | `headlineValid && yearsValid && !submitting && !success` |

Tất cả state hooks (`headline`, `experienceYears`, `bio`, `sportIds`, `submitting`, `success`, `error`) và handler (`toggleSport`, `submit`) **giữ nguyên signature**.

## 4. New: consume real user for preview

Thêm một dòng đọc store (read-only, không mutate):

```ts
import { useAuthStore } from "@/lib/store/useAuthStore";
const user = useAuthStore((s) => s.user); // CurrentUserResponse | null
```

Dùng `user.fullName`, `user.avatarUrl`. Avatar fallback: `initials(user.fullName)` (helper sẵn có trong `@/lib/utils`). Nếu `user` null (chưa hydrate) → preview hiển thị placeholder tên ("Tên của bạn") + avatar initials rỗng/icon, không crash.

## 5. Layout

### Desktop (≥ lg)
- `main` mở rộng max-width từ `660px` → `~960px` (`max-w-5xl`).
- Grid 2 cột: `lg:grid-cols-[1.15fr_0.85fr]`, gap 20px.
- **Hero card** giữ full-width phía trên grid (badge "⏱ Mất khoảng 2 phút" + 3 benefit tiles — tái dùng `BENEFITS` hiện có).
- **Cột trái** = form card (toàn bộ field hiện tại).
- **Cột phải** = sticky sidebar (`lg:sticky lg:top-20`) gồm:
  1. **Live preview card** — avatar + fullName + headline; rows hiển thị: số năm KN, sport chips đã chọn, đoạn đầu bio.
  2. **Checklist "Sau khi đăng ký"** — 4 mục tĩnh, mô tả đúng năng lực thật của platform (tìm thấy hồ sơ / tạo gói tập / quản lý lịch / chỉnh sửa sau). KHÔNG con số fake.

### Tablet & Mobile (< lg)
- Stack 1 cột: hero → form → preview → checklist (theo thứ tự đọc tự nhiên).
- Sidebar bỏ `sticky`. Preview card vẫn render nhưng nằm sau form.

## 6. Field enhancements (chỉ visual/UX, không đổi logic)

- **Tiêu đề hồ sơ**: placeholder phong phú hơn; giữ cap 255.
- **Số năm kinh nghiệm**: giữ `type=number`, `tabular-nums`, max-width hẹp.
- **Môn thể thao**: chip group giữ nguyên `toggleSport`. Bổ sung trạng thái rõ ràng selected / hover / focus-visible ring + `aria-pressed={active}` cho a11y.
- **Giới thiệu**: thêm **character counter** `{bio.length} / 2000` (chỉ đọc state, không đổi cap).
- CTA: giữ label "Đăng ký làm huấn luyện viên" + loading "Đang tạo hồ sơ…" / "Đang chuyển hướng…".

## 7. Live preview content mapping (real-only)

| Preview element | Source | Empty fallback |
|---|---|---|
| Avatar | `user.avatarUrl` → `<img>`, else `initials(user.fullName)` | icon/initials |
| Tên | `user.fullName` | "Tên của bạn" (muted) |
| Headline | `headline` (form) | "Tiêu đề hồ sơ của bạn" (muted) |
| Kinh nghiệm | `experienceYears` năm | ẩn row nếu rỗng |
| Sports | map `sportIds` → `STABLE_SPORTS` name → badges | ẩn row nếu chưa chọn |
| Bio | `bio` (truncate ~120 ký tự) | ẩn row nếu rỗng |

Không có rating, review count, learner count, hay giá — không tồn tại dữ liệu thật ở bước onboarding.

## 8. Visual style

Tuân theo design language hiện hành của trang (đã là light Stripe/Linear):
- bg `slate-50` + 2 soft orb (giữ nguyên).
- Card: `rounded-[20px]` white, border `slate-200`, shadow 2 lớp như hiện tại.
- Preview header: nền gradient nhạt `from-primary/[0.06] to-[#7d6dff]/[0.06]`, avatar gradient `primary → #7d6dff`.
- CTA gradient `violet-600 → fuchsia-500` (giữ nguyên).
- Motion: optional fade-up nhẹ cho 2 cột bằng `motion/react`, respect `useReducedMotion()`. (Có thể bỏ nếu giữ đơn giản — không bắt buộc.)

## 9. Accessibility

- Mỗi field giữ `<label>` liên kết.
- Sport chips: `aria-pressed`, focus-visible ring.
- Error banner `role="alert"`, success `role="status"` (giữ nguyên).
- Preview card là vùng bổ trợ → `aria-hidden` không đặt (vẫn đọc được), nhưng đánh dấu là "xem trước" bằng heading rõ ràng.

## 10. Out of scope

- Không đổi backend, không thêm endpoint.
- Không thêm avatar upload tại trang này (đã có ở `/coach/profile`).
- Không multi-step wizard (Option C bị loại vì step dots gây hiểu nhầm + không có preview).
- Không đổi `PublicNavbar`.

## 11. Verification

1. `npx tsc --noEmit` — sạch.
2. `pnpm lint` (`--max-warnings 0`) — sạch.
3. `pnpm build` — pass.
4. Manual: điền form → preview cập nhật realtime; submit success → redirect `/coach/profile`; needs-relogin → redirect `/login`; lỗi API → banner đỏ; responsive stack đúng < lg.
