import Link from "next/link";

/**
 * The "New here? Create an account" / "Already have an account? Log in" line
 * shown beneath the auth form card.
 */
export function AuthSwitchLink({
  prompt,
  href,
  cta,
}: {
  prompt: string;
  href: string;
  cta: string;
}) {
  return (
    <p className="mt-5 text-center text-[13px] text-slate-500">
      {prompt}{" "}
      <Link
        href={href}
        className="font-semibold text-indigo-700 underline-offset-4 hover:underline"
      >
        {cta}
      </Link>
    </p>
  );
}
