import { forwardRef } from "react";
import {
  TextInput,
  Text,
  View,
  StyleSheet,
  type TextInputProps,
} from "react-native";
import { colors, fontFamily, radii } from "@/theme";

interface TextareaProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<TextInput, TextareaProps>(
  ({ label, error, style, ...props }, ref) => {
    return (
      <View>
        {label && <Text style={styles.label}>{label}</Text>}
        <TextInput
          ref={ref}
          multiline
          textAlignVertical="top"
          style={[styles.textarea, error && styles.textareaError, style]}
          placeholderTextColor={colors.g400}
          {...props}
        />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }
);

Textarea.displayName = "Textarea";

const styles = StyleSheet.create({
  label: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: colors.black,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textarea: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.black,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.white,
    minHeight: 100,
  },
  textareaError: {
    borderColor: colors.red,
  },
  error: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: colors.red,
    marginTop: 4,
  },
});
