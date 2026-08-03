import { transferByToken } from "@wii/api";
import { MoodSetter } from "@/components/layout/MoodSetter";
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { AcceptButton } from "./accept";

export const dynamic = "force-dynamic";

/** Transfer claim page — the recipient's landing from the email. */
export default async function ClaimPage({ params }: { params: { token: string } }) {
  const data = await transferByToken(params.token);
  const state = !data
    ? "missing"
    : data.transfer.status !== "pending"
      ? data.transfer.status
      : data.transfer.expiresAt.getTime() < Date.now()
        ? "expired"
        : "pending";

  const date = data?.eventStartAt
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Malta",
        weekday: "long",
        day: "2-digit",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(data.eventStartAt)
    : "";

  return (
    <>
      <MoodSetter mood="community" />
      <Section max="var(--container-narrow)" style={{ paddingTop: "clamp(120px, 18vh, 200px)", textAlign: "center" }}>
        <SectionLabel style={{ marginBottom: 14 }}>Ticket transfer</SectionLabel>
        {state === "pending" && data ? (
          <>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2rem,6vw,3.5rem)", textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.9, color: "var(--bone)" }}>
              {data.fromName} sent you a night out.
            </h1>
            <p style={{ marginTop: 16, color: "var(--sand)", lineHeight: 1.6 }}>
              <strong>{data.tierName}</strong> · {data.eventTitle}
              <br />
              {date}
            </p>
            <p style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Accepting retires the sender&apos;s QR and issues a fresh ticket in your name.
            </p>
            <AcceptButton token={params.token} />
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2rem,6vw,3.5rem)", textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.9, color: "var(--bone)" }}>
              {state === "accepted" ? "Already claimed." : state === "expired" ? "Offer expired." : state === "cancelled" ? "Offer withdrawn." : "Link not found."}
            </h1>
            <p style={{ marginTop: 16, color: "var(--sand)" }}>
              {state === "accepted"
                ? "This ticket has already been accepted — check My Tickets."
                : "Ask the sender to start a new transfer."}
            </p>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
              <Button href="/account" variant="primary">My tickets</Button>
            </div>
          </>
        )}
      </Section>
    </>
  );
}
