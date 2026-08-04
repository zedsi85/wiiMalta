import { NextResponse } from "next/server";
import { fetchCatalogEvent, fetchSimilar } from "@/lib/catalog";

export const revalidate = 60;

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const event = await fetchCatalogEvent(params.slug);
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const similar = await fetchSimilar(params.slug);
  return NextResponse.json(
    { event, similar },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
