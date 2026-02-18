import { useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, fontFamily, spacing } from "@/theme";
import { supabase } from "@/lib/supabase";
import { useChatMessages, useSendMessage } from "@propian/shared/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { Skeleton, EmptyState } from "@/components/ui";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { IconArrow } from "@/components/icons/IconArrow";
import type { Message } from "@propian/shared/types";

export default function ChatConversationScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const { user } = useAuth();
  const { data: messages, isLoading } = useChatMessages(supabase, roomId);
  const sendMutation = useSendMessage(supabase);

  const currentUserId = user?.id;

  const handleSend = useCallback(
    (content: string) => {
      sendMutation.mutate(
        { roomId, content, type: "text" },
        {
          onSuccess: () => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          },
        }
      );
    },
    [roomId, sendMutation]
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble
        message={item}
        isSent={item.user_id === currentUserId}
      />
    ),
    [currentUserId]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()}>
            <IconArrow size={20} color={colors.black} />
          </Pressable>
          <Skeleton width={150} height={18} />
          <View style={{ width: 20 }} />
        </View>
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                styles.skeletonBubble,
                i % 2 === 0 && styles.skeletonBubbleRight,
              ]}
            >
              <Skeleton width={200} height={50} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // Reverse for inverted FlatList
  const reversedMessages = [...(messages ?? [])].reverse();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconArrow size={20} color={colors.black} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Chat
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.emptyWrapper}>
              <EmptyState
                title="No messages yet"
                description="Send a message to start the conversation."
              />
            </View>
          }
        />

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          disabled={sendMutation.isPending}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
    backgroundColor: colors.white,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: colors.black,
    flex: 1,
    textAlign: "center",
  },
  messageList: {
    paddingVertical: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    padding: spacing.base,
    gap: 12,
    justifyContent: "flex-end",
  },
  skeletonBubble: {
    alignSelf: "flex-start",
  },
  skeletonBubbleRight: {
    alignSelf: "flex-end",
  },
  emptyWrapper: {
    transform: [{ scaleY: -1 }],
  },
});
