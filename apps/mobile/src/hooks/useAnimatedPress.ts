import { useRef, useCallback } from "react";
import { Animated } from "react-native";
import { triggerHaptic, type HapticType } from "./useHaptics";

interface UseAnimatedPressOptions {
  scaleDown?: number;
  duration?: number;
  /** Haptic intensity on press. Set to `false` to disable. Default: "light" */
  haptic?: HapticType | false;
}

export function useAnimatedPress({
  scaleDown = 0.95,
  duration = 100,
  haptic = "light",
}: UseAnimatedPressOptions = {}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    if (haptic) triggerHaptic(haptic);
    Animated.timing(scale, {
      toValue: scaleDown,
      duration,
      useNativeDriver: true,
    }).start();
  }, [scaleDown, duration, haptic]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 15,
      stiffness: 300,
      mass: 1,
      useNativeDriver: true,
    }).start();
  }, []);

  const animatedStyle = {
    transform: [{ scale }],
  };

  return { onPressIn, onPressOut, animatedStyle };
}
