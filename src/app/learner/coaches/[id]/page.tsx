import { permanentRedirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Permanent redirect: /learner/coaches/[id] → /coaches/[id]
 * The public coach profile now lives at the shorter public URL.
 */
export default async function LegacyCoachDetailRedirect({
  params,
}: PageProps) {
  const { id } = await params;
  permanentRedirect(`/coaches/${encodeURIComponent(id)}`);
}
