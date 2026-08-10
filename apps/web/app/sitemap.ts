import type { MetadataRoute } from "next";
import { fetchCatalogEvents } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wiievent.com";
  const events = await fetchCatalogEvents().catch(() => []);
  return [
    { url: site, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/events`, changeFrequency: "daily", priority: 0.9 },
    ...events.map((e) => ({
      url: `${site}/events/${e.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    { url: `${site}/community`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${site}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${site}/partners`, changeFrequency: "monthly", priority: 0.4 },
  ];
}
