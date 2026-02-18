import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Haptic feedback types mapped to real-world use cases:
 *
 * light    — tab switch, chip select, expand/collapse, menu tap
 * medium   — button press, card tap, toggle switch
 * heavy    — FAB press, drag release, important actions
 * success  — form submit success, like/bookmark, purchase complete
 * warning  — delete confirmation shown, reaching a limit
 * error    — failed action, destructive confirm
 */
export type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const impactMap: Record<"light" | "medium" | "heavy", Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

const notificationMap: Record<"success" | "warning" | "error", Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

/**
 * Fire-and-forget haptic trigger.
 * Safe on Android & iOS. Does nothing on web.
 */
export function triggerHaptic(type: HapticType = "medium"): void {
  if (Platform.OS === "web") return;

  if (type === "success" || type === "warning" || type === "error") {
    Haptics.notificationAsync(notificationMap[type]);
  } else {
    Haptics.impactAsync(impactMap[type]);
  }
}

/**
 * Selection feedback — the subtle "tick" used for scrolling pickers,
 * toggling switches, and small state changes.
 */
export function triggerSelection(): void {
  if (Platform.OS === "web") return;
  Haptics.selectionAsync();
}

/**
 * React hook that returns stable haptic trigger functions.
 */
export function useHaptics() {
  const haptic = useCallback((type: HapticType = "medium") => {
    triggerHaptic(type);
  }, []);

  const selection = useCallback(() => {
    triggerSelection();
  }, []);

  return { haptic, selection };
}
