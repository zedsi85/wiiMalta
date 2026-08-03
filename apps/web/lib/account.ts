import "server-only";
import { cookies } from "next/headers";
import { verifyAccountSession } from "@wii/core";

/** Resolve the buyer-account email from the signed session cookie, if any. */
export function accountEmail(): string | null {
  const value = cookies().get("wii_account")?.value;
  if (!value) return null;
  return verifyAccountSession(value, process.env.ORDER_LINK_SECRET!);
}
