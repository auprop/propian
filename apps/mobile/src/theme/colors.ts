import { colors as sharedColors } from "@propian/shared/constants";

export const colors = {
  ...sharedColors,
  // Derived colors for React Native
  lime10: "rgba(168, 255, 57, 0.1)",
  lime25: "rgba(168, 255, 57, 0.25)",
  redBg: "rgba(255, 68, 68, 0.1)",
  transparent: "transparent",
} as const;
