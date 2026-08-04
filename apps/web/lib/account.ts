import "server-only";
import { cookies, headers } from "next/headers";
import { verifyAccountSession } from "@wii/core";

/**
 * Resolve the buyer-account email from either the signed session cookie
 * (web) or an Authorization: Bearer <session> header (mobile app). Same
 * signed value, same accounts — one identity across surfaces.
 */
export function accountEmail(): string | null {
  const secret = process.env.ORDER_LINK_SECRET!;
  const cookieVal = cookies().get("wii_account")?.value;
  if (cookieVal) {
    const email = verifyAccountSession(cookieVal, secret);
    if (email) return email;
  }
  const auth = headers().get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return verifyAccountSession(auth.slice(7), secret);
  }
  return null;
}
