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
  // Backend login body is `{ email, password }`.
  email: z.string().min(1, "Enter your email").email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean().optional(),
});
export type LoginValues = z.infer<typeof loginSchema>;

// Field lengths mirror the backend register contract (fullName 2–150,
// email ≤320, password 8–100). The backend grants the learner role on register,
// so there is no role field here.
export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(150, "Name is too long")
      .regex(/^[\p{L}\s'-]+$/u, "Use letters, spaces, and hyphens only"),
    email: z
      .string()
      .min(1, "Enter your email")
      .email("Enter a valid email")
      .max(320, "Email is too long"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .max(100, "Password is too long"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    terms: z
      .boolean()
      .refine((v) => v === true, "Please accept the terms to continue"),
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
    { id: "upper", label: "Uppercase", passed: /[A-Z]/.test(pw) },
    { id: "lower", label: "Lowercase", passed: /[a-z]/.test(pw) },
    { id: "num", label: "Number", passed: /[0-9]/.test(pw) },
    { id: "sym", label: "Symbol", passed: /[^A-Za-z0-9]/.test(pw) },
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
