/**
 * Stat tile — the "not a chart" form for a single headline number.
 * Value in text ink (never series color); optional tone only for semantic
 * accents (revenue, warnings).
 */
export function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "go" | "warn";
}) {
  const valueClass =
    tone === "go" ? "text-go" : tone === "warn" ? "text-gold" : "text-bone";
  return (
    <div className="card px-4 py-3">
      <div className="label !text-[0.5625rem]">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${valueClass}`}>{value}</div>
      {sub && <div className="mt-0.5 font-mono text-[0.6875rem] text-fog">{sub}</div>}
    </div>
  );
}
