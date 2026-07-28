import type { Config } from "tailwindcss";
import { wiiPreset } from "@wii/ui/tailwind-preset";

const config: Config = {
  presets: [wiiPreset as Config],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  plugins: [],
};

export default config;
