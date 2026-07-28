/**
 * Compatibility shim — the canonical token source moved to @wii/ui so future
 * apps (admin, mobile) share one design system. Existing "@/styles/tokens"
 * imports keep working through this re-export.
 */
export * from "@wii/ui/tokens";
