import React from "react";
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { useFadeUp, usePressScale } from "@/lib/motion";

/** Entrance wrapper: content fades up on mount. Stagger with `delay`. */
export function FadeIn({ children, delay = 0, distance = 14, style }: { children: React.ReactNode; delay?: number; distance?: number; style?: StyleProp<ViewStyle> }) {
  const anim = useFadeUp(delay, distance);
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** Pressable with tactile scale feedback + optional haptic tick. The press
 *  handler fires immediately — the animation never delays the action. */
export function PressScale({
  children,
  style,
  haptic = "light",
  scaleTo = 0.97,
  onPress,
  ...rest
}: PressableProps & { children: React.ReactNode; style?: StyleProp<ViewStyle>; haptic?: "light" | "selection" | "none"; scaleTo?: number }) {
  const press = usePressScale(scaleTo);
  return (
    <Animated.View style={[style, press.style]}>
      <Pressable
        {...rest}
        onPressIn={(e) => {
          press.onPressIn();
          rest.onPressIn?.(e);
        }}
        onPressOut={(e) => {
          press.onPressOut();
          rest.onPressOut?.(e);
        }}
        onPress={(e) => {
          if (haptic === "light") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          else if (haptic === "selection") void Haptics.selectionAsync();
          onPress?.(e);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
