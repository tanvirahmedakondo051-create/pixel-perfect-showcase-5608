export const GRACE_DAYS = 7;
export const PREVIEW_MS = 5 * 60_000;

export type HostingStatus = { state: "active" } | { state: "grace"; daysLeft: number } | { state: "offline" };

/** Decide whether a published site stays online based on when the owner's paid package ended. */
export function hostingStatus(opts: {
  planExpiresAt: string | null;
  planEndedAt: string | null;
  /** Can the plan the user falls back to (or is on) keep sites online? */
  fallbackCanHost: boolean;
}): HostingStatus {
  const now = Date.now();
  let ended: number | null = opts.planEndedAt ? new Date(opts.planEndedAt).getTime() : null;
  if (!ended && opts.planExpiresAt && new Date(opts.planExpiresAt).getTime() < now) ended = new Date(opts.planExpiresAt).getTime();
  if (!ended || opts.fallbackCanHost) return { state: "active" };
  const left = Math.ceil((ended + GRACE_DAYS * 86400_000 - now) / 86400_000);
  return left > 0 ? { state: "grace", daysLeft: left } : { state: "offline" };
}
