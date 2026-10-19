import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

/**
 * Wii motion system (mobile) — one vocabulary for the whole app, mirroring
 * the web tokens in @wii/ui (durFast/base/slow/cinema, easeOut/easeInOut).
 * Built on React Native's Animated API with the native driver: only transform
 * and opacity are animated, so everything runs on the UI thread at 60 fps with
 * no added native dependencies. Reduced-motion is honoured everywhere.
 */
export const dur = { fast: 140, base: 240, slow: 480, cinema: 900 } as const;
export const ease = {
  out: Easing.bezier(0.22, 1, 0.36, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  snap: Easing.bezier(0.34, 1.4, 0.64, 1),
} as const;

let reduceMotionCache: boolean | null = null;
/** OS "Reduce Motion" preference (cached; updates live). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(reduceMotionCache ?? false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        reduceMotionCache = v;
        if (mounted) setReduced(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
      reduceMotionCache = v;
      setReduced(v);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/** Mount entrance: fade + rise. Returns an animated style to spread onto an Animated.View. */
export function useFadeUp(delay = 0, distance = 14, duration: number = dur.slow) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      v.setValue(1);
      return;
    }
    const anim = Animated.timing(v, { toValue: 1, duration, delay, easing: ease.out, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [v, delay, duration, reduced]);
  return {
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  };
}

/** Tactile press: scales down on press-in, springs back on release. */
export function usePressScale(to = 0.97) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    if (reduced) return;
    Animated.timing(scale, { toValue: to, duration: dur.fast, easing: ease.out, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    if (reduced) return;
    Animated.spring(scale, { toValue: 1, speed: 30, bounciness: 6, useNativeDriver: true }).start();
  };
  return { style: { transform: [{ scale }] }, onPressIn, onPressOut };
}

/** Looping opacity pulse for skeletons (stops when reduced motion is on). */
export function usePulse(min = 0.45, max = 0.9) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(max)).current;
  useEffect(() => {
    if (reduced) {
      v.setValue((min + max) / 2);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: min, duration: 700, easing: ease.inOut, useNativeDriver: true }),
        Animated.timing(v, { toValue: max, duration: 700, easing: ease.inOut, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, min, max, reduced]);
  return v;
}

/** One-shot "pop" used when a number changes (e.g. the checkout total). */
export function usePop() {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const pop = () => {
    if (reduced) return;
    scale.setValue(1.06);
    Animated.spring(scale, { toValue: 1, speed: 24, bounciness: 8, useNativeDriver: true }).start();
  };
  return { style: { transform: [{ scale }] }, pop };
}
