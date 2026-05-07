export const dynamic = "force-dynamic";

import { Smartphone } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { MobileForm } from "./mobile-form";

export default function MobileFriendlyPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Mobile-friendly checker"
        description="Google deprecated their public Mobile-Friendly Test in 2023. We replaced it. Checks viewport tag, charset, responsive images, fixed-width elements, tap-target sizes, intrusive interstitials. No PSI key."
        icon={Smartphone}
        accent="emerald"
      />
      <MobileForm />
    </div>
  );
}
