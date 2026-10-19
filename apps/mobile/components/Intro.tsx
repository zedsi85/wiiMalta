import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { c, font } from "@/lib/theme";
import { dur, ease, useReducedMotion } from "@/lib/motion";

/**
 * Launch moment — the Wii mark assembles out of the dark: the circle breathes
 * in, the ember sun rises over the sea-line, the waves settle, the wordmark
 * lands. ~900 ms, transform/opacity only (native driver), then the overlay
 * dissolves to reveal the app that has been rendering underneath the whole
 * time — nothing waits on this. Shown once per cold start (module flag), never
 * on navigation; collapsed to an instant fade under Reduce Motion.
 */
let introPlayed = false;
export function shouldPlayIntro() {
  return !introPlayed;
}

const ACircle = Animated.createAnimatedComponent(Circle);
const APath = Animated.createAnimatedComponent(Path);

export function Intro({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const ring = useRef(new Animated.Value(0)).current; // scale/opacity of the circle
  const sun = useRef(new Animated.Value(0)).current; // rises
  const waves = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const veil = useRef(new Animated.Value(1)).current; // overlay opacity

  useEffect(() => {
    introPlayed = true;
    const finish = () =>
      Animated.timing(veil, { toValue: 0, duration: reduced ? dur.base : dur.slow, easing: ease.inOut, useNativeDriver: true }).start(({ finished }) => finished && onDone());
    if (reduced) {
      ring.setValue(1); sun.setValue(1); waves.setValue(1); word.setValue(1);
      const t = setTimeout(finish, 250);
      return () => clearTimeout(t);
    }
    const seq = Animated.sequence([
      Animated.timing(ring, { toValue: 1, duration: 420, easing: ease.out, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(sun, { toValue: 1, duration: 480, easing: ease.out, useNativeDriver: true }),
        Animated.timing(waves, { toValue: 1, duration: 420, delay: 120, easing: ease.out, useNativeDriver: true }),
        Animated.timing(word, { toValue: 1, duration: 380, delay: 220, easing: ease.out, useNativeDriver: true }),
      ]),
      Animated.delay(260),
    ]);
    seq.start(({ finished }) => finished && finish());
    return () => seq.stop();
  }, [reduced, ring, sun, waves, word, veil, onDone]);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.void, alignItems: "center", justifyContent: "center", opacity: veil, zIndex: 100 }]}>
      <Animated.View style={{ opacity: ring, transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }] }}>
        <Svg width={112} height={112} viewBox="0 0 100 100">
          <Circle cx="50" cy="50" r="46" fill="none" stroke={c.bone} strokeWidth="3.6" />
          {/* sun: rises from below the sea-line; clipped look via opacity ramp */}
          <APath
            d="M34 53 A16 16 0 0 1 66 53 Z"
            fill={c.ember}
            opacity={sun}
            translateY={sun.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) as unknown as number}
          />
          <APath d="M13 53 q9.25 -7 18.5 0 t18.5 0 t18.5 0 t18.5 0" fill="none" stroke={c.bone} strokeWidth="3.6" strokeLinecap="round" opacity={waves} />
          <APath d="M24 64 q13 -5 26 0 t26 0" fill="none" stroke={c.bone} strokeWidth="3.6" strokeLinecap="round" opacity={waves.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] })} />
          <ACircle cx="50" cy="50" r="46" fill="none" stroke={c.ember} strokeWidth="1" opacity={sun.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] })} />
        </Svg>
      </Animated.View>
      <Animated.View style={{ marginTop: 22, alignItems: "center", opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
        <Text style={{ fontFamily: font.displayBlack, fontSize: 28, letterSpacing: 6, color: c.bone }}>WII</Text>
        <Text style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: 4, color: c.ember, marginTop: 6 }}>EVENT MALTA</Text>
      </Animated.View>
      <View style={{ position: "absolute", bottom: 48 }}>
        <Text style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: 3, color: c.ash }}>MALTA AFTER DARK</Text>
      </View>
    </Animated.View>
  );
}
