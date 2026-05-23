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
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
  remember: z.boolean().optional(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(60, "Name is too long")
      .regex(/^[\p{L}\s'-]+$/u, "Use letters, spaces, hyphens only"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .max(72, "Password is too long")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[a-z]/, "Include at least one lowercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    terms: z
      .boolean()
      .refine((v) => v === true, "You must agree to the terms"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type RegisterValues = z.infer<typeof registerSchema>;

// ============================================================================
// Password strength
// ============================================================================

export interface PasswordStrength {
  /** 0..4 — none → strong */
  score: 0 | 1 | 2 | 3 | 4;
  label: "Empty" | "Weak" | "Fair" | "Good" | "Strong";
  checks: { id: string; label: string; passed: boolean }[];
}

export function evaluatePassword(pw: string): PasswordStrength {
  const checks = [
    { id: "len", label: "8+ characters", passed: pw.length >= 8 },
    { id: "upper", label: "Uppercase letter", passed: /[A-Z]/.test(pw) },
    { id: "lower", label: "Lowercase letter", passed: /[a-z]/.test(pw) },
    { id: "num", label: "Number", passed: /[0-9]/.test(pw) },
    { id: "sym", label: "Symbol (optional)", passed: /[^A-Za-z0-9]/.test(pw) },
  ];
  if (pw.length === 0) {
    return { score: 0, label: "Empty", checks };
  }
  const passed = checks.filter((c) => c.passed).length;
  // Map raw pass count → score 1..4
  const score: PasswordStrength["score"] =
    passed <= 1 ? 1 : passed === 2 ? 2 : passed === 3 ? 3 : 4;
  const label =
    score === 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";
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
