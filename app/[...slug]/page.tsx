import { notFound } from "next/navigation";
import PageShell, { Prose } from "@/components/PageShell";
import WaitlistJoin from "@/components/WaitlistJoin";
import { allRoutes, getPage } from "@/lib/pages";
import { pageMeta } from "@/lib/seo";

// Routes with their own components; everything else in content/pages renders here.
const CUSTOM = new Set(["/", "/pricing", "/gallery", "/software"]);

export const dynamicParams = false;

export function generateStaticParams() {
  return allRoutes()
    .filter((r) => !CUSTOM.has(r.path) && !r.path.startsWith("/software/"))
    .map((r) => ({ slug: r.path.replace(/^\//, "").split("/") }));
}

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = getPage("/" + slug.join("/"));
  if (!page) return {};
  return pageMeta({ title: page.title || page.h1, description: page.description, path: page.path });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const page = getPage("/" + slug.join("/"));
  if (!page) notFound();
  return (
    <PageShell>
      {page.html.split(/<div data-embed="waitlist"><\/div>/).map((part, i) => (
        <div key={i}>
          {i > 0 && <WaitlistJoin />}
          <Prose html={part} />
        </div>
      ))}
    </PageShell>
  );
}
