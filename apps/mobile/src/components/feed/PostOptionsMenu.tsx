import { View, Text, Pressable, Modal, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme";
import { supabase } from "@/lib/supabase";
import { triggerHaptic } from "@/hooks/useHaptics";
import { useFollowStatus, useFollow, useMuteStatus, useMute, useBlockStatus, useBlock } from "@propian/shared/hooks";
import { IconClose } from "@/components/icons/IconClose";
import { IconEye } from "@/components/icons/IconEye";
import { IconUser } from "@/components/icons/IconUser";
import { IconLock } from "@/components/icons/IconLock";
import { IconFlag } from "@/components/icons/IconFlag";
import { IconShare } from "@/components/icons/IconShare";
import { IconEdit } from "@/components/icons/IconEdit";
import Svg, { Path } from "react-native-svg";
import type { Post } from "@propian/shared/types";

function IconTrash({ size = 20, color = "#ff4444" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconChevRight({ size = 16, color = "#a3a3a3" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

interface PostOptionsMenuProps {
  visible: boolean;
  post: Post | null;
  isOwnPost: boolean;
  onClose: () => void;
  onDelete: (postId: string) => void;
  onEdit: (post: Post) => void;
  onNotInterested: (postId: string) => void;
  onEmbed: (postId: string) => void;
}

export function PostOptionsMenu({
  visible,
  post,
  isOwnPost,
  onClose,
  onDelete,
  onEdit,
  onNotInterested,
  onEmbed,
}: PostOptionsMenuProps) {
  const insets = useSafeAreaInsets();
  const authorId = post?.user_id ?? "";
  const { data: followStatus } = useFollowStatus(supabase, authorId);
  const { follow, unfollow } = useFollow(supabase);
  const isFollowing = followStatus === "following";
  const { data: isMuted } = useMuteStatus(supabase, authorId);
  const { mute, unmute } = useMute(supabase);
  const { data: isBlocked } = useBlockStatus(supabase, authorId);
  const { block, unblock } = useBlock(supabase);

  if (!post) return null;

  const authorName = post.author?.display_name || "this user";
  const authorUsername = post.author?.username || "";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Drag handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {isOwnPost ? (
            <>
              {/* Edit */}
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  triggerHaptic("light");
                  onEdit(post);
                  onClose();
                }}
              >
                <View style={styles.iconCircle}>
                  <IconEdit size={20} color={colors.g600} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuLabel}>Edit post</Text>
                  <Text style={styles.menuDesc}>Modify your post content</Text>
                </View>
                <IconChevRight size={16} color={colors.g300} />
              </Pressable>

              <View style={styles.divider} />

              {/* Delete */}
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  triggerHaptic("warning");
                  onDelete(post.id);
                  onClose();
                }}
              >
                <View style={[styles.iconCircle, styles.iconCircleDanger]}>
                  <IconTrash size={20} color={colors.red} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuLabel, styles.menuLabelDanger]}>Delete post</Text>
                  <Text style={styles.menuDesc}>Permanently remove this post</Text>
                </View>
                <IconChevRight size={16} color={colors.g300} />
              </Pressable>
            </>
          ) : (
            <>
              {/* Not interested */}
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  triggerHaptic("light");
                  onNotInterested(post.id);
                  onClose();
                }}
              >
                <View style={styles.iconCircle}>
                  <IconEye size={20} color={colors.g600} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuLabel}>Not interested</Text>
                  <Text style={styles.menuDesc}>See fewer posts like this</Text>
                </View>
                <IconChevRight size={16} color={colors.g300} />
              </Pressable>

              <View style={styles.divider} />

              {/* Follow / Unfollow */}
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  triggerHaptic("light");
                  if (isFollowing) {
                    unfollow.mutate(post.user_id);
                  } else {
                    follow.mutate(post.user_id);
                  }
                  onClose();
                }}
              >
                <View style={[styles.iconCircle, isFollowing && styles.iconCircleActive]}>
                  <IconUser size={20} color={isFollowing ? colors.green : colors.g600} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuLabel, isFollowing && styles.menuLabelActive]}>
                    {isFollowing ? `Unfollow @${authorUsername}` : `Follow @${authorUsername}`}
                  </Text>
                  <Text style={styles.menuDesc}>
                    {isFollowing ? "Remove from your feed" : "See their posts in your feed"}
                  </Text>
                </View>
                <IconChevRight size={16} color={colors.g300} />
              </Pressable>

              <View style={styles.divider} />

              {/* Mute / Unmute */}
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  triggerHaptic("light");
                  if (isMuted) {
                    unmute.mutate(authorId);
                  } else {
                    mute.mutate(authorId);
                  }
                  onClose();
                }}
              >
                <View style={[styles.iconCircle, isMuted && styles.iconCircleActive]}>
                  <IconClose size={20} color={isMuted ? colors.green : colors.g600} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuLabel, isMuted && styles.menuLabelActive]}>
                    {isMuted ? `Unmute @${authorUsername}` : `Mute @${authorUsername}`}
                  </Text>
                  <Text style={styles.menuDesc}>
                    {isMuted ? "Show their posts in your feed" : "Hide their posts from your feed"}
                  </Text>
                </View>
                <IconChevRight size={16} color={colors.g300} />
              </Pressable>

              <View style={styles.divider} />

              {/* Block / Unblock */}
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  if (isBlocked) {
                    triggerHaptic("light");
                    unblock.mutate(authorId);
                    onClose();
                  } else {
                    triggerHaptic("warning");
                    onClose();
                    Alert.alert(
                      `Block @${authorUsername}?`,
                      "They won't be able to see your profile or posts, and you won't see theirs. You'll also unfollow each other.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Block",
                          style: "destructive",
                          onPress: () => block.mutate(authorId),
                        },
                      ]
                    );
                  }
                }}
              >
                <View style={[styles.iconCircle, isBlocked ? styles.iconCircleActive : styles.iconCircleDanger]}>
                  <IconLock size={20} color={isBlocked ? colors.green : colors.red} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuLabel, isBlocked ? styles.menuLabelActive : styles.menuLabelDanger]}>
                    {isBlocked ? `Unblock @${authorUsername}` : `Block @${authorUsername}`}
                  </Text>
                  <Text style={styles.menuDesc}>
                    {isBlocked ? "Allow them to see your profile again" : "They won't be able to see your profile"}
                  </Text>
                </View>
                <IconChevRight size={16} color={colors.g300} />
              </Pressable>

              <View style={styles.divider} />

              {/* Embed */}
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  triggerHaptic("light");
                  onEmbed(post.id);
                  onClose();
                }}
              >
                <View style={styles.iconCircle}>
                  <IconShare size={20} color={colors.g600} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuLabel}>Embed post</Text>
                  <Text style={styles.menuDesc}>Copy embed code for websites</Text>
                </View>
                <IconChevRight size={16} color={colors.g300} />
              </Pressable>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 4,
  },
  handleRow: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.g200,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.g50,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleActive: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  iconCircleDanger: {
    backgroundColor: "rgba(255, 68, 68, 0.1)",
  },
  menuItemContent: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 16,
    color: colors.black,
  },
  menuLabelActive: {
    color: colors.green,
  },
  menuLabelDanger: {
    color: colors.red,
  },
  menuDesc: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g400,
  },
  divider: {
    height: 1,
    backgroundColor: colors.g100,
    marginHorizontal: 20,
  },
});
