import { type ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontFamily, spacing } from "@/theme";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  icon: {
    marginBottom: 16,
    opacity: 0.4,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: colors.black,
    textAlign: "center",
  },
  description: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g500,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  action: {
    marginTop: 20,
  },
});
