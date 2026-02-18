import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radii } from "@/theme";
import { supabase } from "@/lib/supabase";
import { useComments, useCreateComment } from "@propian/shared/hooks";
import { triggerHaptic } from "@/hooks/useHaptics";
import { Avatar, Skeleton } from "@/components/ui";
import { IconClose } from "@/components/icons/IconClose";
import { IconSend } from "@/components/icons/IconSend";
import { IconVerified } from "@/components/icons/IconVerified";
import { IconComment } from "@/components/icons/IconComment";
import { timeAgo } from "@propian/shared/utils";
import type { Comment } from "@propian/shared/types";

interface CommentSheetProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
}

export function CommentSheet({ visible, postId, onClose }: CommentSheetProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");

  const { query } = useComments(supabase, postId);
  const createComment = useCreateComment(supabase);

  const comments: Comment[] = useMemo(
    () => (query.data?.pages?.flatMap((page) => (Array.isArray(page) ? page : [])) ?? []) as Comment[],
    [query.data]
  );

  const handleSend = () => {
    const content = text.trim();
    if (!content || createComment.isPending) return;
    createComment.mutate(
      { postId, content },
      {
        onSuccess: () => {
          setText("");
          triggerHaptic("success");
        },
      }
    );
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.comment}>
      <Avatar
        src={item.author?.avatar_url}
        name={item.author?.display_name || ""}
        size="sm"
      />
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor} numberOfLines={1}>
            {item.author?.display_name || "Unknown"}
          </Text>
          {item.author?.is_verified && (
            <IconVerified size={12} color={colors.lime} />
          )}
          <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={[styles.safe, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onClose}>
              <IconClose size={24} color={colors.black} />
            </Pressable>
            <Text style={styles.title}>Comments</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Comments list */}
          {query.isLoading ? (
            <View style={styles.loadingContainer}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.skeletonRow}>
                  <Skeleton width={32} height={32} radius={16} />
                  <View style={{ gap: 6, flex: 1 }}>
                    <Skeleton width={120} height={12} />
                    <Skeleton width="90%" height={12} />
                  </View>
                </View>
              ))}
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconComment size={40} color={colors.g300} />
              <Text style={styles.emptyTitle}>No comments yet</Text>
              <Text style={styles.emptyDesc}>Be the first to comment!</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={renderComment}
              contentContainerStyle={styles.listContent}
            />
          )}

          {/* Input bar */}
          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment..."
              placeholderTextColor={colors.g400}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={handleSend}
              style={[
                styles.sendButton,
                (!text.trim() || createComment.isPending) && styles.sendButtonDisabled,
              ]}
              disabled={!text.trim() || createComment.isPending}
            >
              <IconSend size={18} color={text.trim() ? colors.white : colors.g400} />
            </Pressable>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: colors.black,
  },
  loadingContainer: {
    padding: spacing.base,
    gap: 20,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 16,
    color: colors.g600,
    marginTop: 8,
  },
  emptyDesc: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g400,
  },
  listContent: {
    padding: spacing.base,
    gap: 16,
  },
  comment: {
    flexDirection: "row",
    gap: 10,
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  commentAuthor: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: colors.black,
    flexShrink: 1,
  },
  commentTime: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: colors.g400,
    marginLeft: 4,
  },
  commentText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.black,
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: spacing.base,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.g200,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.black,
    backgroundColor: colors.g50,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: colors.g100,
  },
});
