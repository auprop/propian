import { Switch, View, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors, fontFamily } from "@/theme";
import { triggerSelection } from "@/hooks/useHaptics";

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Toggle({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
  style,
}: ToggleProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.textContainer}>
        {label && <Text style={styles.label}>{label}</Text>}
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          triggerSelection();
          onValueChange(v);
        }}
        disabled={disabled}
        trackColor={{ false: colors.g200, true: colors.lime }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.g200}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: colors.black,
  },
  description: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g500,
    marginTop: 2,
  },
});
