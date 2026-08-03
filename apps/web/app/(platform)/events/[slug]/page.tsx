import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventDetail } from "@/components/screens/EventDetail";
import { fetchCatalogEvent, fetchCatalogEvents, fetchSimilar } from "@/lib/catalog";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const events = await fetchCatalogEvents();
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const event = await fetchCatalogEvent(params.slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.blurb,
  };
}

export default async function EventDetailPage({ params }: { params: { slug: string } }) {
  const event = await fetchCatalogEvent(params.slug);
  if (!event) notFound();
  const similar = await fetchSimilar(params.slug);

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wii-malta-web.vercel.app";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.iso,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue,
      address: { "@type": "PostalAddress", addressLocality: event.city, addressCountry: "MT" },
    },
    description: event.blurb,
    organizer: { "@type": "Organization", name: "Wii Event Malta", url: site },
    offers: event.tiers.map((t) => ({
      "@type": "Offer",
      name: t.name,
      price: t.price.replace("€", ""),
      priceCurrency: "EUR",
      availability:
        t.status === "soldout"
          ? "https://schema.org/SoldOut"
          : "https://schema.org/InStock",
      url: `${site}/events/${event.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EventDetail event={event} similar={similar} />
    </>
  );
}
