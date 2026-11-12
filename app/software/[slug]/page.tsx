import { notFound } from "next/navigation";
import PageShell, { Prose } from "@/components/PageShell";
import software from "@/content/software.json";
import { getPage } from "@/lib/pages";
import { pageMeta } from "@/lib/seo";

export const dynamicParams = false;

/** One page per software record in content/software.json; body ported from the matching vectoros.one page. */
export function generateStaticParams() {
  return software.products.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = getPage(`/software/${slug}`);
  if (!page) return {};
  return pageMeta({ title: page.title || page.h1, description: page.description, path: page.path });
}

export default async function SoftwareDetail({ params }: Props) {
  const { slug } = await params;
  const page = getPage(`/software/${slug}`);
  if (!page) notFound();
  return (
    <PageShell>
      <Prose html={page.html} />
    </PageShell>
  );
}
