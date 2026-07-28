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
  return <EventDetail event={event} similar={similar} />;
}
