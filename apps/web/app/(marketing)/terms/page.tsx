import type { Metadata } from "next";
import { LegalPage } from "../legal";

export const metadata: Metadata = {
  title: "Terms of Service — Wii Event Malta",
  description: "Terms governing ticket purchases, event entry, transfers and the ambassador programme on Wii Event Malta.",
};

const CONTACT = "zedsi85@gmail.com";

export default function TermsPage() {
  return (
    <LegalPage label="Legal" title="Terms of Service" updated="5 August 2026">
      <p>
        These terms govern your use of the Wii Event Malta website, mobile apps and ticketing services
        (&ldquo;Wii&rdquo;, &ldquo;we&rdquo;). By buying a ticket or creating an account you agree to them.
      </p>

      <h2>Tickets</h2>
      <ul>
        <li>A ticket grants one entry to the stated event, subject to the venue&rsquo;s rules and capacity.</li>
        <li>
          Entry uses a personal QR code that refreshes automatically in your wallet. Screenshots or copies may
          be refused — each ticket admits one person, once.
        </li>
        <li>Tickets are delivered by email and in the mobile app after payment is confirmed.</li>
        <li>You may transfer a ticket to another person through the wallet&rsquo;s transfer feature before the event.</li>
      </ul>

      <h2>Payments</h2>
      <p>
        Payments are processed by Revolut. Prices are shown in euro and include applicable taxes. Your order is
        confirmed only when payment is completed; reserved tickets are released if payment isn&rsquo;t finished
        within the reservation window.
      </p>

      <h2>Refunds &amp; changes</h2>
      <ul>
        <li>If an event is cancelled, tickets are refunded in full to the original payment method.</li>
        <li>
          If an event is significantly rescheduled or relocated, you may keep your ticket or request a refund
          within 14 days of the announcement.
        </li>
        <li>
          Otherwise tickets are non-refundable, except where required by law. Refund requests:{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </li>
      </ul>

      <h2>Entry &amp; conduct</h2>
      <p>
        Venues may impose age limits, dress codes and security checks. Entry may be refused, without refund, for
        intoxication, aggression, fraud (including resold or duplicated QR codes) or breach of venue rules.
      </p>

      <h2>Ambassador programme</h2>
      <p>
        Ambassadors earn commission on ticket sales made through their personal link, at the rate shown in
        their dashboard. Commissions become payable after the event takes place and are void if the underlying
        order is refunded. Self-purchases, spam and misleading promotion are prohibited and forfeit commissions.
      </p>

      <h2>Liability</h2>
      <p>
        We provide the ticketing service; events are delivered by the named organizer and venue. To the extent
        permitted by law, our liability for any claim is limited to the amount you paid for the affected order.
        Nothing in these terms limits liability that cannot be limited under Maltese law.
      </p>

      <h2>Changes &amp; contact</h2>
      <p>
        We may update these terms; material changes will be announced on this page. Questions:{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. These terms are governed by the laws of Malta.
      </p>
    </LegalPage>
  );
}
