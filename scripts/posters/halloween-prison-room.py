#!/usr/bin/env python3
"""ROOM-series poster kit (same CSS/fonts/mark/factory as the shipped covers) + the Halloween Prison ROOM
art, derived from public/venues/old-prison/cell-block.webp. Emits a 1080px page next to this file; render with
headless Chrome at 1080x1350, then encode to apps/web/public/posters/halloween-prison-room.webp (see git log)."""
import base64, pathlib
ROOT = pathlib.Path("/Users/zedsi/Desktop/perso/projects/wiiProjects/wiiMalta/websiteAndPlatform/wiiMalta")
HERE = pathlib.Path(__file__).parent
b64 = lambda p: base64.b64encode((ROOT / p).read_bytes()).decode()

CSS = """
@font-face { font-family: "Archivo Black"; src: url(data:font/ttf;base64,%ARCHIVO%) format("truetype"); font-weight: 900; }
@font-face { font-family: "Space Mono"; src: url(data:font/ttf;base64,%MONO400%) format("truetype"); font-weight: 400; }
@font-face { font-family: "Space Mono"; src: url(data:font/ttf;base64,%MONO700%) format("truetype"); font-weight: 700; }
:root { --bone:#FBF8F1; --ash:#6A6A77; --fog:#9A9AA6; --ember:#FF4D1F; --disp:"Archivo Black",sans-serif; --mono:"Space Mono",monospace; }
html,body { margin:0; background:#000; }
.poster { position: relative; container-type: inline-size; aspect-ratio: 4/5; width: 1080px; overflow: hidden; background: var(--room-ground); }
.poster .art, .poster .art-front { position: absolute; inset: 0; }
.poster .art-front { z-index: 3; pointer-events: none; }
.poster .art svg, .poster .art-front svg { width: 100%; height: 100%; display: block; }
.poster::after { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .5; mix-blend-mode: overlay; z-index: 4;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.6 0 0 0 0 0.6 0 0 0 0 0.6 0 0 0 0.14 0'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E"); }
.p-frame { position: absolute; inset: 3.2cqw; border: 1px solid var(--room-line); pointer-events: none; z-index: 2; }
.p-inner { position: absolute; inset: 0; padding: 7cqw; display: flex; flex-direction: column; z-index: 2; }
.p-head { display: flex; align-items: flex-start; justify-content: space-between; }
.p-mark { width: 11cqw; height: 11cqw; flex: none; }
.p-head-right { text-align: right; }
.p-brand { font: 700 2.5cqw/1.5 var(--mono); letter-spacing: .28em; text-transform: uppercase; color: var(--room-type); }
.p-series { font: 400 2.2cqw/1.6 var(--mono); letter-spacing: .2em; text-transform: uppercase; color: var(--room-dim); }
.p-hero { position: relative; margin-top: auto; }
.p-kicker { font: 700 2.4cqw/1 var(--mono); letter-spacing: .3em; text-transform: uppercase; color: var(--room-accent); margin-bottom: 2.6cqw; }
.p-name { font-family: var(--disp); text-transform: uppercase; line-height: .8; letter-spacing: -0.015em; color: var(--room-type); }
.p-name .ln { display: block; }
.p-name .room { color: transparent; -webkit-text-stroke: max(.28cqw, 1px) var(--room-type); }
.sz-xl { font-size: 21.5cqw; } .sz-lg { font-size: 18.2cqw; } .sz-md { font-size: 11.4cqw; }
.p-info { position: relative; margin-top: 4.6cqw; border-top: 1px solid var(--room-line); padding-top: 3cqw; }
.p-lineup { font: 700 2.5cqw/1 var(--mono); letter-spacing: .18em; text-transform: uppercase; color: var(--room-type); margin-bottom: 2.6cqw; }
.p-lineup em { font-style: normal; color: var(--room-accent); }
.p-grid { display: flex; justify-content: space-between; gap: 2cqw; font: 400 2.15cqw/1.55 var(--mono); text-transform: uppercase; letter-spacing: .06em; color: var(--room-dim); }
.p-grid b { display: block; font-weight: 700; letter-spacing: .12em; color: var(--room-type); }
.p-grid > div:last-child { text-align: right; }
.p-grid > div, .p-grid b { white-space: nowrap; }
.r-prison { --room-ground:#08080a; --room-type:#FBF8F1; --room-dim:#8F8A82; --room-accent:#FF4D1F; --room-line:rgba(199,199,208,.16); }
"""
CSS = CSS.replace("%ARCHIVO%", b64("apps/mobile/node_modules/@expo-google-fonts/archivo/Archivo_900Black.ttf")) \
         .replace("%MONO400%", b64("apps/mobile/node_modules/@expo-google-fonts/space-mono/SpaceMono_400Regular.ttf")) \
         .replace("%MONO700%", b64("apps/mobile/node_modules/@expo-google-fonts/space-mono/SpaceMono_700Bold.ttf"))

def mark(stroke="#FBF8F1", sun="#FF4D1F"):
    return f'''<svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="none" stroke="{stroke}" stroke-width="3.6"/>
      <path d="M34 53 A16 16 0 0 1 66 53 Z" fill="{sun}"/>
      <path d="M13 53 q9.25 -7 18.5 0 t18.5 0 t18.5 0 t18.5 0" fill="none" stroke="{stroke}" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M24 64 q13 -5 26 0 t26 0" fill="none" stroke="{stroke}" stroke-width="3.6" stroke-linecap="round" opacity="0.55"/></svg>'''

# ─── PRISON art: the real cell-block photo, abstracted — barred windows emerging from black ───
PHOTO = "data:image/webp;base64," + b64("apps/web/public/venues/old-prison/cell-block.webp")

def bars(xs, y0, y1, w=2.6, op=.85, grad="p-bar"):
    o = []
    for x in xs:
        o.append(f'<rect x="{x}" y="{y0}" width="{w}" height="{y1-y0}" fill="url(#{grad})" opacity="{op}"/>')
        o.append(f'<rect x="{x+w-0.5}" y="{y0}" width="0.5" height="{y1-y0}" fill="#FBF8F1" opacity="{op*0.22}"/>')
    return "\n".join(o)

ART_PRISON = f'''<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <filter id="p-stone" color-interpolation-filters="sRGB">
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncR type="linear" slope="-1" intercept="1"/><feFuncG type="linear" slope="-1" intercept="1"/><feFuncB type="linear" slope="-1" intercept="1"/></feComponentTransfer>
      <feComponentTransfer><feFuncR type="linear" slope="1.45" intercept="-0.58"/><feFuncG type="linear" slope="1.45" intercept="-0.59"/><feFuncB type="linear" slope="1.42" intercept="-0.56"/></feComponentTransfer>
      <feGaussianBlur stdDeviation="1.1"/>
    </filter>
    <linearGradient id="p-fadeY" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".25" stop-color="#fff"/>
      <stop offset=".7" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="p-fadeX" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".18" stop-color="#fff"/>
      <stop offset=".82" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="p-emergeY"><rect width="400" height="500" fill="url(#p-fadeY)"/></mask>
    <mask id="p-emergeX"><rect width="400" height="500" fill="url(#p-fadeX)"/></mask>
    <linearGradient id="p-bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1B1B21"/><stop offset=".45" stop-color="#4a4a56"/><stop offset="1" stop-color="#131318"/>
    </linearGradient>
    <radialGradient id="p-ember" cx=".5" cy="1" r=".8">
      <stop offset="0" stop-color="#C42C06" stop-opacity=".6"/><stop offset=".65" stop-color="#C42C06" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="p-vig" cx=".5" cy=".45" r=".72">
      <stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".78"/>
    </radialGradient>
    <clipPath id="p-arch"><path d="M142 250 a58 58 0 0 1 116 0 v112 h-116 z"/></clipPath>
  </defs>
  <rect width="400" height="500" fill="#08080a"/>
  <!-- the real facade: three rows of barred windows, stone crushed to black, dissolving at the edges -->
  <g mask="url(#p-emergeY)"><g mask="url(#p-emergeX)" opacity=".74">
    <svg x="-30" y="40" width="460" height="230" viewBox="250 700 1050 275" preserveAspectRatio="xMidYMid slice">
      <image href="{PHOTO}" width="1536" height="2048" filter="url(#p-stone)"/>
    </svg>
  </g></g>
  <!-- iron bars behind the type: the prison's rhythm -->
  {bars([56, 120, 300, 352], 0, 500, 2.4, .55)}
  <!-- the emerging window (the disco ball's place): an arched barred opening, lit from inside -->
  <g clip-path="url(#p-arch)">
    <rect x="142" y="190" width="116" height="180" fill="#101013"/>
    <rect x="142" y="190" width="116" height="180" fill="url(#p-ember)"/>
    {bars([160, 182, 204, 226, 246], 192, 362, 3.4, .95)}
    <rect x="142" y="268" width="116" height="3" fill="#2a2a32"/>
    <rect x="142" y="316" width="116" height="3" fill="#2a2a32"/>
  </g>
  <path d="M142 250 a58 58 0 0 1 116 0 v112 h-116 z" fill="none" stroke="#FBF8F1" stroke-opacity=".55" stroke-width="1.4"/>
  <path d="M142 250 a58 58 0 0 1 116 0" fill="none" stroke="#FBF8F1" stroke-opacity=".25" stroke-width="6"/>
  <!-- light spill on the floor + the ember seam -->
  <ellipse cx="200" cy="366" rx="120" ry="18" fill="#C42C06" opacity=".16"/>
  <rect x="0" y="362" width="400" height="1.2" fill="#FF9E7A" opacity=".45"/>
  <rect width="400" height="500" fill="url(#p-vig)"/>
</svg>'''

ART_PRISON_FRONT = '''<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs><linearGradient id="pf-bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0B0B0E"/><stop offset=".5" stop-color="#3A3A45"/><stop offset="1" stop-color="#0B0B0E"/></linearGradient></defs>
  <g opacity=".62">
    <rect x="216" y="112" width="2.4" height="318" fill="url(#pf-bar)"/><rect x="218" y="112" width="0.5" height="318" fill="#FBF8F1" opacity=".18"/>
    <rect x="274" y="112" width="2.4" height="318" fill="url(#pf-bar)"/><rect x="276" y="112" width="0.5" height="318" fill="#FBF8F1" opacity=".18"/>
  </g>
</svg>'''

def poster(cls, series_line, kicker, name_html, size_cls, lineup_html, date, venue, sub_venue, art, art_front=None):
    return f'''<div class="poster {cls}" role="img">
  <div class="art">{art}</div>
  {f'<div class="art-front">{art_front}</div>' if art_front else ''}
  <div class="p-frame"></div>
  <div class="p-inner">
    <div class="p-head"><div class="p-mark">{mark()}</div>
      <div class="p-head-right"><div class="p-brand">Wii Event Malta</div><div class="p-series">{series_line}</div></div></div>
    <div class="p-hero"><div class="p-kicker">{kicker}</div><div class="p-name {size_cls}">{name_html}</div></div>
    <div class="p-info"><div class="p-lineup">{lineup_html}</div>
      <div class="p-grid"><div><b>{date}</b>2026</div><div><b>{venue}</b>{sub_venue}</div><div><b>22:00–04:00</b>CET</div><div><b>€25</b>Welcome drink</div></div></div>
  </div></div>'''

page = poster("r-prison", "Room Series · Halloween edition", "Wii presents",
    '<span class="ln">Halloween</span><span class="ln">Prison</span><span class="ln room">Room</span>', "sz-md",
    'Lineup — <em>Markelov · Marko Nastic · Mato</em>', "Sat 31 Oct", "Old Prison", "Kordin · Paola",
    ART_PRISON, ART_PRISON_FRONT)
(HERE / "poster-halloween-prison-room.html").write_text(f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{page}</body></html>')
print("emitted")
