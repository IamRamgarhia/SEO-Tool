import Link from "next/link";
import { ArrowLeft, Library, Globe } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import {
  PROSPECTS,
  CATEGORY_LABELS,
  COUNTRY_LABELS,
  NICHE_LABELS,
} from "@/lib/backlink-prospects-data";
import { ProspectsLibrary } from "./prospects-library";

export const dynamic = "force-dynamic";

export default function ProspectsLibraryPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href="/link-building"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Back to link building
      </Link>

      <PageHeader
        title="Backlink prospects library"
        description="A curated catalog of real sites where you can earn backlinks — directories, guest-post platforms, resource pages, HARO-style sources, podcast directories, local citations (US, UK, IN, DE, FR, AU, JP, KR, and 25+ more countries). Each entry has DA, link type, cost, difficulty, and a step-by-step how-to."
        icon={Library}
        accent="emerald"
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-muted-foreground ring-1 ring-inset ring-white/10">
            <Globe className="size-3" />
            {PROSPECTS.length} prospects · 30+ countries
          </span>
        }
      />

      <ProspectsLibrary
        prospects={PROSPECTS}
        categoryLabels={CATEGORY_LABELS}
        countryLabels={COUNTRY_LABELS}
        nicheLabels={NICHE_LABELS}
      />
    </div>
  );
}
