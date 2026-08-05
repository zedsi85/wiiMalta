import type { Metadata } from "next";
import { LegalPage } from "../legal";

export const metadata: Metadata = {
  title: "Privacy Policy — Wii Event Malta",
  description: "How Wii Event Malta collects, uses and protects your data across our website, ticketing platform and mobile app.",
};

const CONTACT = "zedsi85@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalPage label="Legal" title="Privacy Policy" updated="5 August 2026">
      <p>
        This policy explains how Wii Event Malta (&ldquo;Wii&rdquo;, &ldquo;we&rdquo;) handles personal data on our
        website, ticketing platform and mobile apps. We operate from Malta and process data in line with the EU
        General Data Protection Regulation (GDPR).
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Ticket purchases:</strong> your email address, the tickets you buy, order amounts and event
          attendance (check-in scans). Card details are processed entirely by our payment provider, Revolut —
          they never reach our servers.
        </li>
        <li>
          <strong>Account:</strong> your email address (used for one-time sign-in codes), saved events, and — if
          you enable notifications in the mobile app — a device push token.
        </li>
        <li>
          <strong>Ambassadors:</strong> name, contact details and payout details (IBAN / Revolut / PayPal),
          stored encrypted, used solely to pay commissions.
        </li>
        <li>
          <strong>Referrals:</strong> if you open an ambassador link, a referral code is stored in a cookie so
          the ambassador is credited if you buy a ticket.
        </li>
      </ul>

      <h2>What we use it for</h2>
      <ul>
        <li>Delivering tickets, entry QR codes and purchase receipts by email (contract performance).</li>
        <li>Door check-in and fraud prevention at events (legitimate interest).</li>
        <li>Optional event notifications you switch on in the app (consent — revocable anytime).</li>
        <li>Paying ambassador commissions (contract performance).</li>
      </ul>
      <p>We do not sell personal data, and we do not run third-party advertising or cross-app tracking.</p>

      <h2>Who processes it</h2>
      <p>
        We use Revolut (payments), Supabase (database hosting, EU region), Vercel (website hosting), Brevo
        (transactional email) and Expo (mobile push delivery). Each processes data only on our instructions.
      </p>

      <h2>Retention</h2>
      <p>
        Order and ticket records are kept as financial transaction records for the period required by Maltese
        tax and accounting law. Saved events, push tokens and profile details are kept until you delete them or
        your account.
      </p>

      <h2 id="delete">Deleting your account</h2>
      <p>
        In the mobile app: Profile → Delete account. This erases your saved events, registered devices and
        profile details immediately. Purchase records are retained as required by law. You can also request
        deletion by emailing <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from the address you used to buy —
        we action requests within 30 days.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the GDPR you can request access, correction, deletion, restriction or portability of your data,
        and object to processing based on legitimate interest. Contact{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. You may also lodge a complaint with the Office of the
        Information and Data Protection Commissioner (IDPC), Malta.
      </p>

      <h2>Contact</h2>
      <p>
        Wii Event Malta · <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
    </LegalPage>
  );
}
