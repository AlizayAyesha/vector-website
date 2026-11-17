import Link from "next/link";
import PageShell from "@/components/PageShell";
import { Logo } from "@/components/Logo";
import release from "@/content/release.json";
import { getPage } from "@/lib/pages";
import { pageMeta } from "@/lib/seo";
import { CONTACT_EMAIL } from "@/lib/site";

const page = getPage("/download");

export const metadata = pageMeta({ title: page?.title || "Windows beta access", description: page?.description || "", path: "/download" });

const REQUEST = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Vector OS Windows beta")}`;

/**
 * Public download page: version, release information and the download / access action only.
 * Integrity data (filename, SHA-256, byte length, source revision) stays in content/release.json → "verification"
 * and is deliberately not rendered here; it is supplied with each build.
 */
export default function DownloadPage() {
  const facts: [string, string][] = [
    ["Version", release.version],
    ["Release date", release.releaseDate ?? "Not published yet"],
    ["System", release.system],
    ["Runtime", release.runtime],
    ["Host", release.host],
  ];
  return (
    <PageShell>
      <header className="max-w-3xl">
        <p className="eyebrow">Vector OS for Windows</p>
        <h1 className="mt-4 text-balance text-5xl font-semibold tracking-[-0.035em] md:text-7xl">{page?.h1 || "Join the Windows beta."}</h1>
        <p className="mt-5 text-lg text-fg-2">Request access and the requirements for your tools.</p>
      </header>

      <section aria-labelledby="dl-title" className="mt-12 overflow-hidden rounded-3xl border border-line bg-card">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-fg text-on-fg">
              <Logo className="size-7" />
            </span>
            <div className="min-w-0">
              <h2 id="dl-title" className="text-2xl font-semibold tracking-tight">Windows beta</h2>
              <p className="mt-1 text-sm text-muted">Windows 10/11 · 64-bit · macOS is not available</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <a href={REQUEST} className="btn-primary btn-lg">
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M8 2v8m0 0 3-3m-3 3L5 7M3 13h10" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Request beta access
            </a>
            <p className="text-xs text-muted">A qualified public installer is not available here yet.</p>
          </div>
        </div>

        <dl className="grid border-t border-line sm:grid-cols-2 lg:grid-cols-5">
          {facts.map(([k, v]) => (
            <div key={k} className="min-w-0 border-b border-line px-6 py-4 sm:border-r lg:border-b-0 lg:last:border-r-0">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-fg">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-6 border-t border-line p-6 md:grid-cols-[1fr_2fr] md:p-8">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              Release notes
              <span className="rounded-full border border-dashed border-line px-2 py-px text-[10px] font-normal text-muted">{release.status}</span>
            </p>
            <p className="mt-2 text-sm text-muted">{release.statusNote}</p>
          </div>
          <div>
            <ul className="space-y-2 text-sm text-fg-2">
              {release.notes.map((n) => (
                <li key={n} className="flex gap-2.5"><span className="mt-2 size-1 shrink-0 rounded-full bg-muted" />{n}</li>
              ))}
              <li className="flex gap-2.5"><span className="mt-2 size-1 shrink-0 rounded-full bg-muted" />{release.referenceHost}</li>
            </ul>
            <Link href="/releases" className="mt-4 inline-flex text-sm text-fg underline decoration-line underline-offset-4 hover:decoration-fg">All release notes</Link>
          </div>
        </div>
      </section>
      <p className="mt-4 text-sm text-muted">Opens your email app. Requesting information does not confirm access or compatibility.</p>

      <section aria-labelledby="install-h" className="mt-16 grid gap-8 md:grid-cols-[1fr_2fr]">
        <h2 id="install-h" className="text-3xl font-semibold tracking-tight">Before installing</h2>
        <div>
          <ol className="space-y-3">
            {[
              "Request the exact build and its requirements. Each supplied build comes with the details you need to verify it.",
              "Verify the file and publisher. Keep Windows protections enabled.",
              "Use a supported writable local installation folder and workspace. Follow the supplied build’s location and maintenance instructions.",
              "Check current host/connector compatibility separately. Installed software does not mean it is connected.",
              "Keep the exact error if setup fails. Preserve your workspace before repair, rollback or uninstall.",
            ].map((s, i) => (
              <li key={s} className="flex gap-4 rounded-2xl border border-line bg-card px-5 py-4 text-sm text-fg-2">
                <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                {s}
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-2">
            <Link href="/tutorials/install-vector" className="btn-ghost">Installation guide</Link>
            <Link href="/releases" className="btn-ghost">Release notes</Link>
            <Link href="/support" className="btn-ghost">Get help</Link>
            <a href="#email-updates" className="btn-ghost">Release updates</a>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
