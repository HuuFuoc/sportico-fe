// ============================================================================
// Coach profile media types — mirrors the backend constant
// `SporticoApp.Shared.Constants.CoachProfileMediaTypes`.
//
// CRITICAL: the UI shows the Vietnamese `label`, but the value SENT to the
// backend MUST be the exact English `value` (certificate | award | gallery |
// identity | other). The media-type field is rendered as a <select> combobox —
// never free text — so an invalid type can't be submitted.
// ============================================================================

export const COACH_MEDIA_TYPES = [
  { value: "certificate", label: "Chứng chỉ" },
  { value: "award", label: "Giải thưởng" },
  { value: "gallery", label: "Thư viện hình ảnh" },
  { value: "identity", label: "Xác minh danh tính" },
  { value: "other", label: "Khác" },
] as const;

export type CoachMediaType = (typeof COACH_MEDIA_TYPES)[number]["value"];

/** Exact set of values the backend accepts (case-insensitive on its side). */
export const COACH_MEDIA_TYPE_VALUES: readonly CoachMediaType[] =
  COACH_MEDIA_TYPES.map((t) => t.value);

/** Vietnamese label for a media-type value (falls back to the raw value). */
export function coachMediaLabel(value: string | null | undefined): string {
  const found = COACH_MEDIA_TYPES.find(
    (t) => t.value === (value ?? "").toLowerCase(),
  );
  return found?.label ?? (value ?? "Khác");
}

export function isCoachMediaType(value: string): value is CoachMediaType {
  return COACH_MEDIA_TYPE_VALUES.includes(value.toLowerCase() as CoachMediaType);
}
