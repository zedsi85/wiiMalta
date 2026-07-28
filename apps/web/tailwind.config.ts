import type { Config } from "tailwindcss";
import { wiiPreset } from "@wii/ui/tailwind-preset";

/**
 * Wii Event Malta — web app Tailwind config.
 * The theme comes from the shared design-system preset (@wii/ui); the canonical
 * CSS custom properties live in app/globals.css. App-specific extensions only
 * below this line.
 */
const config: Config = {
  presets: [wiiPreset as Config],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  plugins: [],
};

export default config;
