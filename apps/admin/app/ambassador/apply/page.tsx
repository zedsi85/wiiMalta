import { ApplyForm } from "./form";

export const metadata = { title: "Become an ambassador" };

/** Public application page — no login required. */
export default function ApplyPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6">
      <div className="mb-1 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ember">
        Wii Event Malta
      </div>
      <h1 className="mb-2 text-3xl font-bold">Become an ambassador</h1>
      <p className="mb-6 text-sm text-fog">
        Bring your people to the island&apos;s best nights — earn commission on every ticket sold
        through your link, with a live dashboard, payouts, and printable flyers.
      </p>
      <ApplyForm />
    </main>
  );
}
