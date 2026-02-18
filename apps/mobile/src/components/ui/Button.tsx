import { type ReactNode, useRef, useCallback } from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  Animated,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, fontFamily, radii, borders, shadows } from "@/theme";
import { triggerHaptic } from "@/hooks/useHaptics";

function ArrowIcon({ color = "#000" }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 17L17 7"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 7h10v10"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type ButtonVariant = "primary" | "lime" | "ghost" | "danger" | "text-btn" | "";
type ButtonSize = "sm" | "";

interface ButtonProps {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  noIcon?: boolean;
  iconOnly?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  children,
  variant = "",
  size = "",
  icon,
  noIcon = false,
  iconOnly = false,
  disabled = false,
  onPress,
  style,
  fullWidth = false,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const iconRotation = useRef(new Animated.Value(0)).current;

  const hideIcon = noIcon || variant === "text-btn";

  const handlePressIn = useCallback(() => {
    triggerHaptic("light");
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(iconRotation, {
        toValue: 45,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        damping: 15,
        stiffness: 300,
        mass: 1,
        useNativeDriver: true,
      }),
      Animated.spring(iconRotation, {
        toValue: 0,
        damping: 15,
        stiffness: 300,
        mass: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const iconRotateStr = iconRotation.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const counterRotateStr = iconRotation.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "-360deg"],
  });

  // Resolve styles based on variant
  const containerStyle = [
    styles.base,
    size === "sm" && styles.sm,
    variant === "primary" && styles.primary,
    variant === "lime" && styles.lime,
    variant === "ghost" && styles.ghost,
    variant === "danger" && styles.danger,
    variant === "text-btn" && styles.textBtn,
    variant === "" && styles.default,
    iconOnly && styles.iconOnly,
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textColor =
    variant === "primary"
      ? colors.white
      : variant === "danger"
        ? colors.red
        : colors.black;

  const iconPillBg =
    variant === "primary" ? colors.lime : variant === "lime" ? colors.black : colors.lime;

  const iconColor =
    variant === "primary" ? colors.black : variant === "lime" ? colors.lime : colors.black;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[{ transform: [{ scale }] }, containerStyle]}
    >
      {!iconOnly && children && (
        <Text
          style={[
            styles.text,
            size === "sm" && styles.textSm,
            { color: textColor },
          ]}
        >
          {typeof children === "string" ? children : children}
        </Text>
      )}
      {!hideIcon && (
        <Animated.View
          style={[
            styles.iconPill,
            size === "sm" && styles.iconPillSm,
            { backgroundColor: iconPillBg },
            { transform: [{ rotate: iconRotateStr }] },
          ]}
        >
          <Animated.View style={{ transform: [{ rotate: counterRotateStr }] }}>
            {icon ?? <ArrowIcon color={iconColor} />}
          </Animated.View>
        </Animated.View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.lg,
    paddingVertical: 9,
    paddingLeft: 22,
    paddingRight: 9,
    ...shadows.sm,
    backgroundColor: colors.white,
  },
  sm: {
    paddingVertical: 6,
    paddingLeft: 16,
    paddingRight: 6,
  },
  primary: {
    backgroundColor: colors.black,
  },
  lime: {
    backgroundColor: colors.lime,
  },
  ghost: {
    backgroundColor: colors.white,
    borderColor: colors.g300,
    shadowColor: "transparent",
    elevation: 0,
  },
  danger: {
    backgroundColor: colors.white,
    borderColor: colors.red,
  },
  textBtn: {
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingLeft: 0,
    paddingRight: 0,
    shadowColor: "transparent",
    elevation: 0,
  },
  default: {
    backgroundColor: colors.white,
  },
  iconOnly: {
    paddingLeft: 9,
    paddingRight: 9,
    justifyContent: "center",
  },
  fullWidth: {
    width: "100%",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    flex: 1,
  },
  textSm: {
    fontSize: 13,
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  iconPillSm: {
    width: 26,
    height: 26,
    borderRadius: 8,
    marginLeft: 8,
  },
});
