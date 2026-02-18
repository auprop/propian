import { type ReactNode } from "react";
import {
  Pressable,
  View,
  StyleSheet,
  Platform,
  Animated,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, radii, borders, shadows } from "@/theme";
import { useAnimatedPress } from "@/hooks/useAnimatedPress";

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({ children, onPress, style, noPadding = false }: CardProps) {
  const { onPressIn, onPressOut, animatedStyle } = useAnimatedPress({
    scaleDown: 0.98,
  });

  const content = (
    <View style={[styles.inner, noPadding && styles.noPadding, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <View style={styles.wrapper}>
        {Platform.OS === "android" && (
          <View style={styles.androidShadow} />
        )}
        <AnimatedPressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={[styles.card, animatedStyle]}
        >
          {content}
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {Platform.OS === "android" && <View style={styles.androidShadow} />}
      <View style={styles.card}>{content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.lg,
    ...shadows.sm,
  },
  inner: {
    padding: 16,
  },
  noPadding: {
    padding: 0,
  },
  androidShadow: {
    position: "absolute",
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: colors.black,
    borderRadius: radii.lg,
  },
});
