import { Platform, type ViewStyle } from "react-native";
import { colors } from "./colors";

export const borders = {
  standard: {
    borderWidth: 2,
    borderColor: colors.black,
  } as ViewStyle,
  light: {
    borderWidth: 1,
    borderColor: colors.g200,
  } as ViewStyle,
  lime: {
    borderWidth: 2,
    borderColor: colors.lime,
  } as ViewStyle,
};

/**
 * Soft, premium shadows.
 * Clean drop shadows that feel modern without the heavy brutalist look.
 */
export const shadows = {
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    },
    android: {
      elevation: 2,
    },
  })!,
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
  })!,
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,
};

/**
 * For Android, use this as a sibling View behind the card for extra shadow depth.
 * Position it absolute with a subtle offset.
 */
export const androidShadowLayer = (radius: number): ViewStyle => ({
  position: "absolute",
  top: 1,
  left: 0,
  right: 0,
  bottom: -2,
  backgroundColor: "rgba(0,0,0,0.04)",
  borderRadius: radius,
});
