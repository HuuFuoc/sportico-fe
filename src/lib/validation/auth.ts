import { z } from "zod";
import type {
  FieldValues,
  Resolver,
  ResolverError,
  ResolverSuccess,
} from "react-hook-form";

// ============================================================================
// Schemas
// ============================================================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
  password: z
    .string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
    .max(72, "Mật khẩu quá dài"),
  remember: z.boolean().optional(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Họ tên phải có ít nhất 2 ký tự")
      .max(60, "Họ tên quá dài")
      .regex(/^[\p{L}\s'-]+$/u, "Chỉ dùng chữ cái, khoảng trắng và dấu nối"),
    email: z
      .string()
      .min(1, "Vui lòng nhập email")
      .email("Email không hợp lệ"),
    password: z
      .string()
      .min(8, "Ít nhất 8 ký tự")
      .max(72, "Mật khẩu quá dài")
      .regex(/[A-Z]/, "Cần ít nhất một chữ hoa")
      .regex(/[a-z]/, "Cần ít nhất một chữ thường")
      .regex(/[0-9]/, "Cần ít nhất một chữ số"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
    terms: z
      .boolean()
      .refine((v) => v === true, "Bạn cần đồng ý với điều khoản"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });
export type RegisterValues = z.infer<typeof registerSchema>;

// ============================================================================
// Password strength
// ============================================================================

export interface PasswordStrength {
  /** 0..4 — none → strong */
  score: 0 | 1 | 2 | 3 | 4;
  label: "Trống" | "Yếu" | "Trung bình" | "Tốt" | "Mạnh";
  checks: { id: string; label: string; passed: boolean }[];
}

export function evaluatePassword(pw: string): PasswordStrength {
  const checks = [
    { id: "len", label: "Tối thiểu 8 ký tự", passed: pw.length >= 8 },
    { id: "upper", label: "Có chữ hoa", passed: /[A-Z]/.test(pw) },
    { id: "lower", label: "Có chữ thường", passed: /[a-z]/.test(pw) },
    { id: "num", label: "Có chữ số", passed: /[0-9]/.test(pw) },
    { id: "sym", label: "Có ký tự đặc biệt", passed: /[^A-Za-z0-9]/.test(pw) },
  ];
  if (pw.length === 0) {
    return { score: 0, label: "Trống", checks };
  }
  const passed = checks.filter((c) => c.passed).length;
  // Map raw pass count → score 1..4
  const score: PasswordStrength["score"] =
    passed <= 1 ? 1 : passed === 2 ? 2 : passed === 3 ? 3 : 4;
  const label =
    score === 1 ? "Yếu" : score === 2 ? "Trung bình" : score === 3 ? "Tốt" : "Mạnh";
  return { score, label, checks };
}

// ============================================================================
// Tiny zod ↔ react-hook-form resolver
// Avoids @hookform/resolvers as a dependency.
// ============================================================================

export function zodResolver<TSchema extends z.ZodType>(
  schema: TSchema,
): Resolver<z.infer<TSchema> & FieldValues> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return {
        values: result.data,
        errors: {},
      } as ResolverSuccess<z.infer<TSchema> & FieldValues>;
    }
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".") || "root";
      if (!errors[path]) {
        errors[path] = { type: issue.code, message: issue.message };
      }
    }
    return {
      values: {},
      errors,
    } as ResolverError<z.infer<TSchema> & FieldValues>;
  };
}
