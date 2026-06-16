import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { events, getEvent, similarEvents } from "@/lib/events";
import { EventDetail } from "@/components/screens/EventDetail";

export function generateStaticParams() {
  return events.map((e) => ({ slug: e.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const event = getEvent(params.slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.blurb,
  };
}

export default function EventDetailPage({ params }: { params: { slug: string } }) {
  const event = getEvent(params.slug);
  if (!event) notFound();
  return <EventDetail event={event} similar={similarEvents(params.slug)} />;
}
