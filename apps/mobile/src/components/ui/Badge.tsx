import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors, fontFamily, radii } from "@/theme";

type BadgeVariant = "lime" | "red" | "blue" | "gray" | "green" | "amber";

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const variantStyles: Record<
  BadgeVariant,
  { bg: string; text: string }
> = {
  lime: { bg: colors.lime25, text: colors.black },
  red: { bg: "rgba(255,68,68,0.1)", text: colors.red },
  blue: { bg: "rgba(59,130,246,0.1)", text: colors.blue },
  gray: { bg: colors.g100, text: colors.g600 },
  green: { bg: "rgba(34,197,94,0.1)", text: colors.green },
  amber: { bg: "rgba(255,170,0,0.1)", text: colors.amber },
};

export function Badge({ children, variant = "gray", style }: BadgeProps) {
  const { bg, text } = variantStyles[variant];

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    alignSelf: "flex-start",
  },
  text: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
