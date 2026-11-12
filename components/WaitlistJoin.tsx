import { WAITLIST_FORM } from "@/lib/site";

/**
 * The live waitlist form posts to vectoros.one/api/waitlist, which does not allow cross-origin requests,
 * so this preview links to the live form instead of collecting details itself.
 */
export default function WaitlistJoin() {
  return (
    <section id="join" aria-labelledby="join-title" className="mt-12 max-w-[52rem] rounded-3xl border border-line bg-card p-6 md:p-8">
      <h2 id="join-title" className="text-2xl font-semibold tracking-tight">Join the waitlist</h2>
      <p className="mt-2 text-muted">One weekly email. Unsubscribe at any time.</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a href={WAITLIST_FORM} className="btn-primary btn-lg">
          Join the waitlist
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
        <span className="text-sm text-muted">Opens the sign-up form on vectoros.one.</span>
      </div>
    </section>
  );
}
