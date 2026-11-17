import { Suspense } from "react";
import PageShell from "@/components/PageShell";
import Gallery from "@/components/Gallery";
import { getPage } from "@/lib/pages";
import { pageMeta } from "@/lib/seo";

const page = getPage("/gallery");

export const metadata = pageMeta({ title: page?.title || "Examples", description: page?.description || "", path: "/gallery" });

export default function GalleryPage() {
  return (
    <PageShell>
      <header className="max-w-3xl">
        <p className="eyebrow">See the work</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.035em] md:text-7xl">Examples</h1>
        <p className="mt-5 text-lg text-fg-2">Recorded projects and ideas to explore.</p>
      </header>
      <Suspense>
        <Gallery />
      </Suspense>
    </PageShell>
  );
}
