import { ImageResponse } from "next/og";
import { fetchCatalogEvent } from "@/lib/catalog";

export const runtime = "nodejs";
export const alt = "Wii Event Malta";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Branded OG card per event — tint gradient + display type, generated live. */
export default async function OgImage({ params }: { params: { slug: string } }) {
  const event = await fetchCatalogEvent(params.slug).catch(() => undefined);
  const tint = event?.tint ?? "linear-gradient(150deg,#3a1410,#120a18 72%)";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "64px 72px",
          backgroundImage: tint.startsWith("linear-gradient") ? tint : undefined,
          backgroundColor: "#0b0b0e",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 10,
            textTransform: "uppercase",
            color: "#ff4d1f",
          }}
        >
          WII EVENT MALTA{event?.type ? ` · ${event.type.toUpperCase()}` : ""}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 104,
            fontWeight: 800,
            lineHeight: 1,
            textTransform: "uppercase",
            color: "#fbf8f1",
            maxWidth: 1000,
          }}
        >
          {event?.title ?? "Malta After Dark"}
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 34, color: "#efe7d6" }}>
          {event ? `${event.dateLong} · ${event.venue}` : "Curated nights across the island."}
        </div>
        <div
          style={{
            position: "absolute",
            top: 56,
            right: 72,
            display: "flex",
            fontSize: 30,
            color: "#fbf8f1",
            padding: "12px 28px",
            border: "3px solid #ff4d1f",
            borderRadius: 999,
          }}
        >
          {event?.priceFrom ? `from ${event.priceFrom}` : "tickets live"}
        </div>
      </div>
    ),
    size
  );
}
