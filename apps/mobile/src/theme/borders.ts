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
 * Neo-brutalist hard offset shadows.
 * iOS: Uses native shadowOffset + shadowRadius: 0 for hard edges.
 * Android: elevation can't do offsets, so we use a shadow layer View approach.
 *          The elevation here is a fallback only.
 */
export const shadows = {
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.black,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
    },
    android: {
      elevation: 4,
    },
  })!,
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.black,
      shadowOffset: { width: 6, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 0,
    },
    android: {
      elevation: 6,
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
 * For Android, use this as a sibling View behind the card to simulate hard offset shadow.
 * Position it absolute, offset by 4/4, same size, black background, same border radius.
 */
export const androidShadowLayer = (radius: number): ViewStyle => ({
  position: "absolute",
  top: 4,
  left: 4,
  right: -4,
  bottom: -4,
  backgroundColor: colors.black,
  borderRadius: radius,
});
