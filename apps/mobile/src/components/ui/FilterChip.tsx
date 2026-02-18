import { Pressable, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors, fontFamily, radii } from "@/theme";
import { triggerSelection } from "@/hooks/useHaptics";

interface FilterChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function FilterChip({
  label,
  active = false,
  onPress,
  style,
}: FilterChipProps) {
  return (
    <Pressable
      onPress={() => {
        triggerSelection();
        onPress?.();
      }}
      style={[styles.chip, active && styles.chipActive, style]}
    >
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.g100,
    borderWidth: 2,
    borderColor: colors.g200,
    minHeight: 36,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  chipActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  text: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: colors.g600,
  },
  textActive: {
    color: colors.lime,
  },
});
