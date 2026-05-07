export const dynamic = "force-dynamic";

import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { DisavowForm } from "./disavow-form";

export default function DisavowPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Disavow file generator"
        description="Paste your backlink list (URLs or domains, optionally TAB-anchor). We auto-flag toxic ones (spam TLDs, casino / payday / random-string domains, suspicious anchors) and emit a Google-spec disavow file."
        icon={ShieldAlert}
        accent="rose"
      />
      <DisavowForm />
    </div>
  );
}
