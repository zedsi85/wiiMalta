# Wii Event Malta — Website

> Malta After Dark. A premium, underground, Mediterranean nightlife event brand &
> ticketing platform. Curated nights across the island — connected after dark.

A cinematic, highly dynamic events & ticketing site built from the **Wii Event
Malta** design system. The homepage is a nine-chapter scroll journey; the rest is
a full ticketing flow (events → detail → checkout → QR).

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** (theme surfaces the canonical CSS-variable design tokens)
- **GSAP** + **ScrollTrigger** — scroll choreography, parallax, pinned gallery
- **Lenis** — smooth scroll, wired into ScrollTrigger
- **Three.js** — cursor-reactive fluid "nightlife paint" background (per-section palettes)
- Custom glow cursor + magnetic CTAs
- `lucide-react` available for icons

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Deploy (Vercel)

Zero-config — Vercel detects Next.js automatically (Build: `next build`,
Output: `.next`). Just import the repo and deploy.

- **Node:** pinned to 22 via `.nvmrc` / `engines` (Next 14 needs ≥ 18.18).
- **Env:** optional `NEXT_PUBLIC_SITE_URL` pins the canonical/OG origin to your
  custom domain. Without it, canonical URLs fall back to the per-deployment
  `VERCEL_URL` (see `.env.example`). No other env vars are required.

## Routes

| Route | What |
|---|---|
| `/` | Cinematic homepage — 9 chapters (Enter the Night → … → Final CTA) |
| `/events` | Listing with live music / location / availability filters |
| `/events/[slug]` | Event detail: hero poster, sticky purchase panel, lineup, info, map, FAQ |
| `/checkout` | 3-step checkout (tickets → details → payment) + promo + QR confirmation |
| `/community` | Digital access pass (utility/loyalty framing), perks, waitlist |
| `/partners` | Partner categories, benefits, contact form |
| `/about` | Brand story, mission, philosophy |

## Architecture

```
app/                 routes + globals.css (design tokens) + cinema.css (homepage chapters)
components/
  layout/            Navbar, Footer, SmoothScrollProvider, CustomCursor, MoodSetter
  sections/          the 9 homepage chapter components
  ui/                Button, MagneticButton, EventCard, TicketTierCard, Countdown,
                     Badge, Tag, Input, QuantitySelector, ArtistCard, MembershipPass,
                     QRTicket, AnimatedHeading, SectionLabel, Section, Reveal, WiiMark
  screens/           EventDetail (client screen behind the [slug] route)
  webgl/             FluidBackground (Three.js shader quad + mood system)
lib/                 events (mock data), cart, animations, lenis, qr, utils
styles/              tokens.ts (TS mirror of the CSS-variable tokens)
```

### Design tokens
The single source of truth is the set of CSS custom properties in
`app/globals.css` (ported verbatim from the brand design system). `tailwind.config.ts`
surfaces the common ones to utility classes; `styles/tokens.ts` mirrors values
needed in JS (e.g. the shader palettes).

## Notes for extending

- **Imagery** is all placeholder `MediaSlot` / gradient zones marked `@asset` —
  drop in real event photography/video.
- **Payments** are not wired — `lib/cart.ts` + the checkout screen are scaffolding
  for Stripe / a custom ticketing + QR service.
- **Community pass / membership** is framed strictly as **access & utility**
  (early tickets, drops, perks) — never investment. Keep the "Soon" framing until
  it ships.
- The **QR ticket** is a stylized visual concept, not a scannable code.
- Everything respects `prefers-reduced-motion`; the custom cursor and heavy
  interactions are disabled on touch / coarse pointers.

Fonts are curated substitutions (Archivo / Archivo Expanded / Space Mono, via
Google Fonts) — swap in `app/globals.css` if you license a display face.
