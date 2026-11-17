import PageShell from "@/components/PageShell";
import SoftwareDirectory from "@/components/SoftwareDirectory";
import software from "@/content/software.json";
import { getPage } from "@/lib/pages";
import { pageMeta } from "@/lib/seo";

const page = getPage("/software");

export const metadata = pageMeta({
  title: page?.title || "Engineering software and connector status",
  description: page?.description || "",
  path: "/software",
});

export default function SoftwarePage() {
  return (
    <PageShell>
      <header className="max-w-3xl">
        <p className="eyebrow">Your engineering toolkit</p>
        <h1 className="mt-4 text-balance text-5xl font-semibold tracking-[-0.035em] md:text-7xl">Find your software.</h1>
        <p className="mt-5 text-lg text-fg-2">Browse tools and check connection status.</p>
      </header>
      <SoftwareDirectory entries={software.entries} groups={software.groups.map((g) => g.name)} />
    </PageShell>
  );
}
