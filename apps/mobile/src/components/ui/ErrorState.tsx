import { View, Text, StyleSheet } from "react-native";
import { colors, fontFamily } from "@/theme";
import { Button } from "./Button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong",
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>⚠️</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button variant="ghost" size="sm" onPress={onRetry}>
          Try Again
        </Button>
      )}
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
  emoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  message: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: colors.g600,
    textAlign: "center",
    marginBottom: 16,
  },
});
