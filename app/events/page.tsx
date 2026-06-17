"use client";

import { useMemo, useState } from "react";
import { MoodSetter } from "@/components/layout/MoodSetter";
import IslandContours from "@/components/visual/IslandContours";
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Tag } from "@/components/ui/Tag";
import { EventCard } from "@/components/ui/EventCard";
import { Reveal } from "@/components/ui/Reveal";
import { events, statusLabel, type EventStatus } from "@/lib/events";

const ALL = "All";

export default function EventsPage() {
  const genres = useMemo(
    () => [ALL, ...Array.from(new Set(events.flatMap((e) => e.genres)))],
    []
  );
  const cities = useMemo(() => [ALL, ...Array.from(new Set(events.map((e) => e.city)))], []);
  const statuses: (EventStatus | typeof ALL)[] = [ALL, "available", "limited", "earlybird", "invite", "soldout"];

  const [genre, setGenre] = useState<string>(ALL);
  const [city, setCity] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);

  const filtered = events.filter(
    (e) =>
      (genre === ALL || e.genres.includes(genre)) &&
      (city === ALL || e.city === city) &&
      (status === ALL || e.status === status)
  );

  return (
    <>
      <IslandContours className="fx-layer" variant="malta" opacity={0.16} animated parallax />
      <div className="page-fx-content">
      <MoodSetter mood="events" />

      {/* Page hero */}
      <Section
        max="var(--container-wide)"
        style={{ paddingTop: "clamp(120px, 18vh, 220px)", paddingBottom: "var(--space-7)" }}
      >
        <SectionLabel style={{ marginBottom: 16 }}>
          The programme · 2026 season
        </SectionLabel>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "clamp(2.75rem, 9vw, 7rem)",
            textTransform: "uppercase",
            letterSpacing: "-0.03em",
            lineHeight: 0.86,
            color: "var(--bone)",
          }}
        >
          All Events
        </h1>
        <p style={{ marginTop: 22, maxWidth: "46ch", color: "var(--sand)", fontSize: "1.0625rem", lineHeight: 1.55 }}>
          Every drop across the islands — caves, forts, rooftops and lagoons. Filter by sound, place
          and availability. The next night is always loading.
        </p>
      </Section>

      {/* Sticky filter bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "var(--glass)",
          backdropFilter: "blur(var(--blur-md)) saturate(1.2)",
          WebkitBackdropFilter: "blur(var(--blur-md)) saturate(1.2)",
          borderTop: "1px solid var(--border-soft)",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--container-wide)",
            margin: "0 auto",
            padding: "16px var(--gutter)",
            display: "grid",
            gap: 12,
          }}
        >
          <FilterRow label="Music" options={genres} active={genre} onPick={setGenre} />
          <FilterRow label="Location" options={cities} active={city} onPick={setCity} />
          <FilterRow
            label="Availability"
            options={statuses as string[]}
            active={status}
            onPick={setStatus}
            render={(o) => (o === ALL ? ALL : statusLabel[o as EventStatus])}
          />
        </div>
      </div>

      {/* Grid */}
      <Section max="var(--container-wide)" style={{ paddingTop: "var(--space-8)" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-faint)",
            marginBottom: 24,
          }}
        >
          {filtered.length} {filtered.length === 1 ? "event" : "events"}
        </div>
        {filtered.length ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "var(--grid-gap)",
            }}
          >
            {filtered.map((e, i) => (
              <Reveal key={e.slug} delay={(i % 3) * 70}>
                <EventCard event={e} index={events.indexOf(e) + 1} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
            Nothing matches yet — try widening the filters.
          </p>
        )}
      </Section>
      </div>
    </>
  );
}

function FilterRow({
  label,
  options,
  active,
  onPick,
  render,
}: {
  label: string;
  options: string[];
  active: string;
  onPick: (o: string) => void;
  render?: (o: string) => string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.625rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--text-faint)",
          minWidth: 92,
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((o) => (
          <Tag key={o} size="sm" active={active === o} onClick={() => onPick(o)}>
            {render ? render(o) : o}
          </Tag>
        ))}
      </div>
    </div>
  );
}
