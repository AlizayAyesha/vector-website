/**
 * Site-wide configuration. One switch controls search-engine visibility:
 *
 *   NEXT_PUBLIC_SITE_INDEXABLE=true   → robots allow, sitemap advertised, no "noindex" tags
 *   (unset / anything else)           → preview mode: robots disallow + noindex,nofollow everywhere
 *
 * Keep it unset on the preview deployment so it never competes with vectoros.one.
 * At launch (site served from vectoros.one) set NEXT_PUBLIC_SITE_INDEXABLE=true and
 * NEXT_PUBLIC_SITE_URL=https://vectoros.one in Vercel → Project → Settings → Environment Variables.
 */
export const INDEXABLE = process.env.NEXT_PUBLIC_SITE_INDEXABLE === "true";

/** Public origin of this deployment (used for the sitemap and absolute OG URLs). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://vector-website-five.vercel.app").replace(/\/$/, "");

/** Canonical origin. Canonical links always point at the official site so the preview never competes with it. */
export const CANONICAL_ORIGIN = (process.env.NEXT_PUBLIC_CANONICAL_ORIGIN || "https://vectoros.one").replace(/\/$/, "");

export const LIVE = "https://vectoros.one";

/** Vector's real scheduler (from vectoros.one's "Book a demo" dialog). */
export const CALENDLY = "https://calendly.com/sh3ikhmabz/go-invite-only-exchange";

/** Live sign-in (vectoros.one/sign-in redirects here). */
export const SIGN_IN = "https://vectorproject.vercel.app/sign-in";

/** Live waitlist form. Its /api/waitlist does not send CORS headers, so we link to the form instead of posting cross-origin. */
export const WAITLIST_FORM = "https://vectoros.one/waitlist#join";

/** Project contact used by vectoros.one for beta, support and sales emails. */
export const CONTACT_EMAIL = "office@sh3ikhmabz.com";

export const THEME_COLOR = "#080A0D";
