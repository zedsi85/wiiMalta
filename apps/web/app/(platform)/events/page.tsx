import EventsScreen from "@/components/screens/EventsScreen";
import { fetchCatalogEvents } from "@/lib/catalog";

export const revalidate = 60;

export default async function EventsPage() {
  const events = await fetchCatalogEvents();
  return <EventsScreen events={events} />;
}
