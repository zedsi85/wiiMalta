import { NextResponse } from "next/server";
import { fetchCatalogEvents } from "@/lib/catalog";

export const revalidate = 60;

/** Public catalogue JSON — same fetchCatalogEvents the website renders from. */
export async function GET() {
  const events = await fetchCatalogEvents();
  return NextResponse.json(
    { events },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
