import { Pressable, Text, StyleSheet, Animated, type ViewStyle } from "react-native";
import { colors, fontFamily, radii } from "@/theme";
import { useAnimatedPress } from "@/hooks/useAnimatedPress";

interface SocialButtonProps {
  label: string;
  onPress?: () => void;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SocialButton({ label, onPress, style }: SocialButtonProps) {
  const { onPressIn, onPressOut, animatedStyle } = useAnimatedPress({
    scaleDown: 0.97,
  });

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.button, animatedStyle, style]}
    >
      <Text style={styles.text}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radii.md,
    backgroundColor: colors.white,
  },
  text: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: colors.black,
  },
});
