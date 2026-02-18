import { useState } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { colors, fontFamily, radii, spacing, shadows } from "@/theme";
import { IconSend } from "@/components/icons/IconSend";
import { IconPhoto } from "@/components/icons/IconPhoto";
import { triggerHaptic } from "@/hooks/useHaptics";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    triggerHaptic("light");
    onSend(trimmed);
    setText("");
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.mediaButton}>
        <IconPhoto size={20} color={colors.g400} />
      </Pressable>
      <TextInput
        style={styles.input}
        placeholder="Type a message..."
        placeholderTextColor={colors.g400}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={2000}
        editable={!disabled}
      />
      <Pressable
        style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={!text.trim() || disabled}
      >
        <IconSend size={18} color={text.trim() ? colors.black : colors.g400} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 2,
    borderTopColor: colors.black,
  },
  mediaButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.black,
    backgroundColor: colors.g100,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.g200,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.lime,
    borderWidth: 2,
    borderColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: colors.g100,
    borderColor: colors.g200,
  },
});
