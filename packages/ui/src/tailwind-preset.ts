import type { Config } from "tailwindcss";

/**
 * Wii design-system Tailwind preset.
 * The canonical design tokens are CSS custom properties (currently declared in
 * apps/web/app/globals.css, ported verbatim from the brand design system); this
 * preset surfaces the most-used ones as utility classes so every Wii app stays
 * on-brand. Prefer the CSS variables for anything token-driven so there is a
 * single source of truth.
 */
export const wiiPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        void: "var(--void)",
        ink: "var(--ink)",
        charcoal: "var(--charcoal)",
        graphite: "var(--graphite)",
        slate: "var(--slate)",
        steel: "var(--steel)",
        ash: "var(--ash)",
        fog: "var(--fog)",
        smoke: "var(--smoke)",
        sand: "var(--sand)",
        bone: "var(--bone)",
        linen: "var(--linen)",
        ember: {
          100: "var(--ember-100)",
          300: "var(--ember-300)",
          500: "var(--ember-500)",
          600: "var(--ember-600)",
          700: "var(--ember-700)",
          DEFAULT: "var(--ember-500)",
        },
        azure: {
          300: "var(--azure-300)",
          500: "var(--azure-500)",
          600: "var(--azure-600)",
          DEFAULT: "var(--azure-500)",
        },
        haze: {
          400: "var(--haze-400)",
          500: "var(--haze-500)",
          600: "var(--haze-600)",
          DEFAULT: "var(--haze-500)",
        },
        gold: {
          300: "var(--gold-300)",
          500: "var(--gold-500)",
          600: "var(--gold-600)",
          DEFAULT: "var(--gold-500)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        ui: ["var(--font-ui)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      maxWidth: {
        container: "var(--container)",
        "container-wide": "var(--container-wide)",
        "container-narrow": "var(--container-narrow)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        pop: "var(--shadow-pop)",
        cta: "var(--glow-cta)",
        "cta-hi": "var(--glow-cta-hi)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
        inout: "cubic-bezier(0.65, 0, 0.35, 1)",
        snap: "cubic-bezier(0.34, 1.4, 0.64, 1)",
      },
    },
  },
};

export default wiiPreset;
