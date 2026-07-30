import { requireAmbassador } from "@/lib/auth";
import { AmbassadorNav } from "../nav";
import { updateSettingsAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requireAmbassador();
  return (
    <>
      <AmbassadorNav name={ctx.displayName ?? ctx.email.split("@")[0]} />
      <h1 className="mb-4 text-xl font-bold">Settings</h1>
      <form action={updateSettingsAction} className="card grid max-w-md gap-3">
        <label className="label" htmlFor="displayName">Display name (shown on the leaderboard)</label>
        <input id="displayName" name="displayName" defaultValue={ctx.displayName ?? ""} className="input-admin" />
        <div className="label">Account email</div>
        <div className="font-mono text-sm text-fog">{ctx.email}</div>
        <div className="label">Programme status</div>
        <span className="pill w-fit">{ctx.status}</span>
        <button className="btn-admin-primary justify-self-start">Save</button>
      </form>
      <p className="mt-4 text-xs text-ash">Tax information & documents arrive in a later release.</p>
    </>
  );
}
