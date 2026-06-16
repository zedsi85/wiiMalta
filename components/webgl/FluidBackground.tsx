"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Mood } from "@/styles/tokens";

/**
 * Wii Event Malta — Three.js fluid "nightlife paint" background.
 *
 * A single full-screen shader quad: domain-warped fbm noise, cursor-reactive,
 * with per-section palettes that cross-fade. The active mood is read from a
 * global the homepage updates (`window.__wiiMood`) so any page can mount this
 * once and let scroll choreography drive the palette.
 *
 * Degrades gracefully: if WebGL is unavailable the CSS gradient on #bg-canvas
 * stays visible. Honours prefers-reduced-motion by slowing time.
 */
export type FluidBackgroundProps = {
  mood?: Mood;
  intensity?: number;
  interactive?: boolean;
  /** CSS mix-blend-mode for the canvas — use "screen" to layer over video. */
  blendMode?: "screen" | "overlay" | "soft-light" | "normal";
  /** Canvas opacity (0–1). Lower it when layering over real footage. */
  opacity?: number;
  /**
   * "fixed" = the global, full-viewport atmospheric background (#bg-canvas).
   * "inline" = an absolutely-positioned overlay that fills its parent (e.g. the
   * subtle Three.js layer sitting over the hero video).
   */
  variant?: "fixed" | "inline";
  /** Whether this instance owns the global window.__wiiSetMood hook. */
  registerMood?: boolean;
};

type Palette = { a: number[]; b: number[]; c: number[]; acc: number[]; i: number };

const MOODS: Record<Mood, Palette> = {
  hero: { a: [0.04, 0.02, 0.06], b: [0.22, 0.05, 0.3], c: [0.1, 0.06, 0.34], acc: [0.45, 0.12, 0.95], i: 1.0 },
  events: { a: [0.05, 0.02, 0.02], b: [0.42, 0.1, 0.04], c: [0.55, 0.18, 0.06], acc: [1.0, 0.3, 0.12], i: 1.15 },
  statement: { a: [0.03, 0.03, 0.035], b: [0.1, 0.1, 0.11], c: [0.16, 0.14, 0.12], acc: [0.55, 0.5, 0.42], i: 0.55 },
  formats: { a: [0.03, 0.04, 0.05], b: [0.06, 0.16, 0.3], c: [0.1, 0.22, 0.38], acc: [0.18, 0.42, 1.0], i: 0.95 },
  ticketing: { a: [0.04, 0.03, 0.05], b: [0.14, 0.08, 0.22], c: [0.2, 0.1, 0.16], acc: [0.85, 0.3, 0.3], i: 0.8 },
  community: { a: [0.03, 0.02, 0.06], b: [0.18, 0.08, 0.34], c: [0.1, 0.14, 0.4], acc: [0.55, 0.3, 1.0], i: 1.05 },
  gallery: { a: [0.02, 0.02, 0.025], b: [0.08, 0.05, 0.05], c: [0.14, 0.08, 0.06], acc: [0.5, 0.22, 0.14], i: 0.7 },
  partners: { a: [0.035, 0.035, 0.04], b: [0.08, 0.09, 0.13], c: [0.12, 0.12, 0.18], acc: [0.3, 0.34, 0.55], i: 0.6 },
  finale: { a: [0.06, 0.02, 0.02], b: [0.5, 0.1, 0.05], c: [0.3, 0.06, 0.3], acc: [1.0, 0.34, 0.14], i: 1.4 },
};

const clone = (m: Palette): Palette => JSON.parse(JSON.stringify(m));

declare global {
  interface Window {
    __wiiMood?: Mood;
    __wiiSetMood?: (m: Mood) => void;
  }
}

export default function FluidBackground({
  mood = "hero",
  intensity = 1,
  interactive = true,
  blendMode = "normal",
  opacity = 1,
  variant = "fixed",
  registerMood = variant === "fixed",
}: FluidBackgroundProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return; // CSS gradient fallback remains
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const cur = clone(MOODS[mood]);
    const tgt = clone(MOODS[mood]);

    const uniforms = {
      u_time: { value: 0 },
      u_res: { value: new THREE.Vector2(1, 1) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_mvel: { value: 0 },
      u_a: { value: new THREE.Vector3(...cur.a) },
      u_b: { value: new THREE.Vector3(...cur.b) },
      u_c: { value: new THREE.Vector3(...cur.c) },
      u_acc: { value: new THREE.Vector3(...cur.acc) },
      u_intensity: { value: cur.i * intensity },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 v_uv;
        void main(){ v_uv = uv; gl_Position = vec4(position, 1.0); }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 v_uv;
        uniform float u_time;
        uniform vec2  u_res;
        uniform vec2  u_mouse;
        uniform float u_mvel;
        uniform vec3  u_a, u_b, u_c, u_acc;
        uniform float u_intensity;

        vec2 hash2(vec2 p){
          p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
          return -1.0 + 2.0*fract(sin(p)*43758.5453123);
        }
        float noise(vec2 p){
          vec2 i = floor(p); vec2 f = fract(p);
          vec2 u = f*f*(3.0-2.0*f);
          return mix(mix(dot(hash2(i+vec2(0,0)), f-vec2(0,0)),
                         dot(hash2(i+vec2(1,0)), f-vec2(1,0)), u.x),
                     mix(dot(hash2(i+vec2(0,1)), f-vec2(0,1)),
                         dot(hash2(i+vec2(1,1)), f-vec2(1,1)), u.x), u.y);
        }
        float fbm(vec2 p){
          float s = 0.0, a = 0.5;
          for(int i=0;i<5;i++){ s += a*noise(p); p *= 2.02; a *= 0.5; }
          return s;
        }

        void main(){
          vec2 uv = v_uv;
          vec2 p = (uv - 0.5);
          p.x *= u_res.x / u_res.y;
          float t = u_time * 0.045;

          vec2 m = u_mouse - 0.5;
          m.x *= u_res.x / u_res.y;
          float md = distance(p, m);
          float pull = smoothstep(0.85, 0.0, md) * (0.18 + u_mvel*0.6);

          vec2 q = vec2(fbm(p*1.4 + t), fbm(p*1.4 + vec2(5.2,1.3) - t));
          vec2 r = vec2(fbm(p*1.8 + 1.7*q + vec2(1.7,9.2) + t*0.6),
                        fbm(p*1.8 + 1.7*q + vec2(8.3,2.8) - t*0.5));
          r += m * pull * 1.6;
          float f = fbm(p*1.6 + 2.4*r + t);

          float field = clamp(f*0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(u_a, u_b, smoothstep(0.15, 0.62, field));
          col = mix(col, u_c, smoothstep(0.5, 0.95, field + length(r)*0.18));

          float vein = smoothstep(0.55, 0.95, length(r));
          col += u_acc * vein * 0.5 * u_intensity;
          col += u_acc * pull * 0.8 * u_intensity;

          float vig = smoothstep(1.25, 0.25, length(p));
          col *= 0.35 + 0.65*vig;

          float g = hash2(uv*u_res + u_time).x;
          col += g * 0.025;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    const resize = () => {
      const parent = canvas.parentElement;
      const w = variant === "inline" && parent ? parent.clientWidth : window.innerWidth;
      const h = variant === "inline" && parent ? parent.clientHeight : window.innerHeight;
      renderer.setSize(w, h, false);
      uniforms.u_res.value.set(w, h);
    };
    window.addEventListener("resize", resize);
    resize();

    const mouse = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, vel: 0 };
    const onMove = (e: PointerEvent) => {
      if (!interactive) return;
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = 1.0 - e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // Public mood setter — scroll choreography calls window.__wiiSetMood(name).
    // Only the global (fixed) instance owns this hook; the hero overlay stays
    // pinned to its own mood so it never fights the page-wide palette.
    if (registerMood) {
      window.__wiiSetMood = (name: Mood) => {
        const m = MOODS[name];
        if (m) Object.assign(tgt, clone(m));
      };
      if (window.__wiiMood) window.__wiiSetMood(window.__wiiMood);
    }

    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
    const lerp3 = (a: number[], b: number[], k: number) => [
      lerp(a[0], b[0], k),
      lerp(a[1], b[1], k),
      lerp(a[2], b[2], k),
    ];

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const k = 0.04;
      cur.a = lerp3(cur.a, tgt.a, k); uniforms.u_a.value.set(cur.a[0], cur.a[1], cur.a[2]);
      cur.b = lerp3(cur.b, tgt.b, k); uniforms.u_b.value.set(cur.b[0], cur.b[1], cur.b[2]);
      cur.c = lerp3(cur.c, tgt.c, k); uniforms.u_c.value.set(cur.c[0], cur.c[1], cur.c[2]);
      cur.acc = lerp3(cur.acc, tgt.acc, k); uniforms.u_acc.value.set(cur.acc[0], cur.acc[1], cur.acc[2]);
      cur.i = lerp(cur.i, tgt.i, k); uniforms.u_intensity.value = cur.i * intensity;

      const ddx = mouse.x - mouse.px;
      const ddy = mouse.y - mouse.py;
      mouse.vel = lerp(mouse.vel, Math.min(Math.sqrt(ddx * ddx + ddy * ddy) * 12, 1), 0.1);
      mouse.px = lerp(mouse.px, mouse.x, 0.08);
      mouse.py = lerp(mouse.py, mouse.y, 0.08);
      uniforms.u_mouse.value.set(mouse.px, mouse.py);
      uniforms.u_mvel.value = mouse.vel;

      uniforms.u_time.value += prefersReduced ? dt * 0.15 : dt;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
      if (registerMood) delete window.__wiiSetMood;
      quad.geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [mood, intensity, interactive, variant, registerMood]);

  const inlineStyle: React.CSSProperties =
    variant === "inline"
      ? { position: "absolute", inset: 0, width: "100%", height: "100%", opacity, mixBlendMode: blendMode, pointerEvents: "none" }
      : { opacity, mixBlendMode: blendMode };

  return (
    <canvas
      id={variant === "fixed" ? "bg-canvas" : undefined}
      ref={ref}
      aria-hidden="true"
      style={inlineStyle}
    />
  );
}
