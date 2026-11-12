import PageShell from "@/components/PageShell";
import Pricing from "@/components/Pricing";
import { getPage } from "@/lib/pages";
import { pageMeta } from "@/lib/seo";

const page = getPage("/pricing");

export const metadata = pageMeta({ title: page?.title || "Pricing", description: page?.description || "", path: "/pricing" });

export default function PricingPage() {
  return (
    <PageShell>
      <Pricing />
    </PageShell>
  );
}
