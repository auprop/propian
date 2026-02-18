import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme";
import { Avatar } from "@/components/ui";
import { IconClose } from "@/components/icons/IconClose";
import { IconVerified } from "@/components/icons/IconVerified";
import { Button, Textarea } from "@/components/ui";
import { timeAgo } from "@propian/shared/utils";
import type { Post } from "@propian/shared/types";

interface QuoteComposerProps {
  visible: boolean;
  quotedPost: Post | null;
  onSubmit: (content: string) => void;
  onClose: () => void;
  isPending: boolean;
}

export function QuoteComposer({ visible, quotedPost, onSubmit, onClose, isPending }: QuoteComposerProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");

  const handleSubmit = () => {
    const content = text.trim();
    if (!content) return;
    onSubmit(content);
    setText("");
  };

  const handleClose = () => {
    setText("");
    onClose();
  };

  if (!quotedPost) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={[styles.safe, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleClose}>
              <IconClose size={24} color={colors.black} />
            </Pressable>
            <Text style={styles.title}>Quote</Text>
            <Button
              variant="primary"
              size="sm"
              noIcon
              onPress={handleSubmit}
              disabled={!text.trim() || isPending}
            >
              {isPending ? "Posting..." : "Post"}
            </Button>
          </View>

          {/* Textarea */}
          <Textarea
            placeholder="Add your thoughts..."
            value={text}
            onChangeText={setText}
            style={styles.input}
            autoFocus
          />

          {/* Quoted post preview */}
          <View style={styles.quotedPost}>
            <View style={styles.quotedHeader}>
              <Avatar
                src={quotedPost.author?.avatar_url}
                name={quotedPost.author?.display_name || ""}
                size="sm"
              />
              <View style={styles.quotedMeta}>
                <View style={styles.quotedNameRow}>
                  <Text style={styles.quotedName} numberOfLines={1}>
                    {quotedPost.author?.display_name || "Unknown"}
                  </Text>
                  {quotedPost.author?.is_verified && (
                    <IconVerified size={12} color={colors.lime} />
                  )}
                </View>
                <Text style={styles.quotedHandle}>
                  @{quotedPost.author?.username || "user"} · {timeAgo(quotedPost.created_at)}
                </Text>
              </View>
            </View>
            <Text style={styles.quotedContent} numberOfLines={4}>
              {quotedPost.content}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: colors.black,
  },
  input: {
    borderWidth: 0,
    borderRadius: 0,
    fontSize: 16,
    minHeight: 120,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  quotedPost: {
    marginHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 12,
    padding: 14,
    backgroundColor: colors.g50,
  },
  quotedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  quotedMeta: {
    flex: 1,
  },
  quotedNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quotedName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: colors.black,
  },
  quotedHandle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: colors.g400,
    marginTop: 1,
  },
  quotedContent: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g600,
    lineHeight: 20,
  },
});
