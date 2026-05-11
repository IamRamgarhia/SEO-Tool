import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { csvResponse } from "@/lib/csv-export";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      url: clients.url,
      niche: clients.niche,
      country: clients.country,
      city: clients.city,
      language: clients.language,
      businessType: clients.businessType,
      email: clients.email,
      phone: clients.phone,
      address: clients.address,
      gbpUrl: clients.gbpUrl,
      gscProperty: clients.gscProperty,
      ga4PropertyId: clients.ga4PropertyId,
      techStack: clients.techStack,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .orderBy(desc(clients.createdAt));

  return csvResponse(
    "clients.csv",
    [
      "id",
      "name",
      "url",
      "niche",
      "country",
      "city",
      "language",
      "businessType",
      "email",
      "phone",
      "address",
      "gbpUrl",
      "gscProperty",
      "ga4PropertyId",
      "techStack",
      "createdAt",
    ],
    rows.map((r) => [
      r.id,
      r.name,
      r.url,
      r.niche ?? "",
      r.country ?? "",
      r.city ?? "",
      r.language ?? "",
      r.businessType ?? "",
      r.email ?? "",
      r.phone ?? "",
      r.address ?? "",
      r.gbpUrl ?? "",
      r.gscProperty ?? "",
      r.ga4PropertyId ?? "",
      Array.isArray(r.techStack) ? r.techStack.join("|") : "",
      r.createdAt,
    ]),
  );
}
