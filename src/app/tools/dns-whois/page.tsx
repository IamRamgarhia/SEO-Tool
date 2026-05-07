export const dynamic = "force-dynamic";

import { Globe } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { DnsForm } from "./dns-form";

export default function DnsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="DNS + WHOIS / RDAP"
        description="Resolve A / AAAA / MX / NS / TXT / CAA, plus registrar + expiry via RDAP. Catches missing SPF / DMARC / CAA, near-expiry domains, broken nameserver setups. No API key — uses public RDAP gateway."
        icon={Globe}
        accent="cyan"
      />
      <DnsForm />
    </div>
  );
}
