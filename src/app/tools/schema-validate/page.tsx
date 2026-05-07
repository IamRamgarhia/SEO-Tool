export const dynamic = "force-dynamic";

import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { ValidateForm } from "./validate-form";

export default function SchemaValidatePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Schema validator (live URL)"
        description="Paste any URL — we extract every JSON-LD block and validate it. Catches missing required fields, invalid JSON, missing canonical, type-specific pitfalls (dateModified, priceCurrency, etc). Always cross-check with Google's Rich Results Test before shipping."
        icon={ShieldCheck}
        accent="emerald"
      />
      <ValidateForm />
    </div>
  );
}
