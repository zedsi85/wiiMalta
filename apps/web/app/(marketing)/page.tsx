import HomeScreen from "@/components/screens/HomeScreen";
import { fetchCatalogEvents, fetchFeatured } from "@/lib/catalog";

// Catalogue is served from Postgres; revalidate keeps the homepage fresh
// without a request-time DB round-trip.
export const revalidate = 300;

export default async function HomePage() {
  const [events, featured] = await Promise.all([fetchCatalogEvents(), fetchFeatured()]);
  return <HomeScreen featured={featured ?? events[0]} events={events} />;
}
