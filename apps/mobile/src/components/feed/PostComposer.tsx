import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontFamily, radii, spacing, shadows } from "@/theme";
import { triggerHaptic } from "@/hooks/useHaptics";
import { Avatar } from "@/components/ui";
import Svg, { Path, Circle } from "react-native-svg";

/* ─── Inline Icons ─── */
function IconX({ size = 22, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconTrendUp({ size = 18, color = "#22c55e" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 6l-9.5 9.5-5-5L1 18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 6h6v6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconTrendDown({ size = 18, color = "#ff4444" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 18l-9.5-9.5-5 5L1 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 18h6v-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconMinus({ size = 18, color = "#a3a3a3" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ─── Constants ─── */
const MAX_CHARS = 2000;

type Sentiment = "bullish" | "bearish" | "neutral" | null;

const SENTIMENTS: { value: Sentiment; label: string; color: string; icon: any }[] = [
  { value: "bullish", label: "Bullish", color: colors.green, icon: IconTrendUp },
  { value: "bearish", label: "Bearish", color: colors.red, icon: IconTrendDown },
  { value: "neutral", label: "Neutral", color: colors.g400, icon: IconMinus },
];

/* ─── Props ─── */
interface PostComposerProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    content: string;
    sentiment_tag?: Sentiment;
  }) => void;
  isPending?: boolean;
  avatar?: string | null;
  displayName?: string;
}

/* ─── Component ─── */
export function PostComposer({
  visible,
  onClose,
  onSubmit,
  isPending = false,
  avatar,
  displayName = "",
}: PostComposerProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [content, setContent] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment>(null);
  const [showSentiments, setShowSentiments] = useState(false);

  // Animated progress ring
  const charProgress = content.length / MAX_CHARS;
  const isNearLimit = content.length > MAX_CHARS * 0.9;
  const isOverLimit = content.length > MAX_CHARS;
  const charsRemaining = MAX_CHARS - content.length;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setContent("");
      setSentiment(null);
      setShowSentiments(false);
      // Small delay to ensure modal is fully rendered
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || isOverLimit || isPending) return;
    triggerHaptic("success");
    onSubmit({
      content: trimmed,
      sentiment_tag: sentiment,
    });
    setContent("");
    setSentiment(null);
  }, [content, sentiment, isOverLimit, isPending, onSubmit]);

  const toggleSentiment = useCallback((s: Sentiment) => {
    triggerHaptic("light");
    setSentiment((prev) => (prev === s ? null : s));
  }, []);

  const canPost = content.trim().length > 0 && !isOverLimit && !isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.root}
      >
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <Pressable
              onPress={() => {
                triggerHaptic("light");
                onClose();
              }}
              style={styles.closeBtn}
              hitSlop={12}
            >
              <IconX size={22} color={colors.g500} />
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={!canPost}
              style={[
                styles.postBtn,
                canPost && styles.postBtnActive,
                isPending && { opacity: 0.6 },
              ]}
            >
              <Text
                style={[
                  styles.postBtnText,
                  canPost && styles.postBtnTextActive,
                ]}
              >
                {isPending ? "Posting..." : "Post"}
              </Text>
            </Pressable>
          </View>

          {/* ── Composer Body ── */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={styles.composerRow}>
              {/* Avatar */}
              <View style={styles.avatarCol}>
                <Avatar
                  src={avatar}
                  name={displayName}
                  size="md"
                />
                {/* Vertical thread line (visual polish) */}
                <View style={styles.threadLine} />
              </View>

              {/* Input area */}
              <View style={styles.inputCol}>
                <TextInput
                  ref={inputRef}
                  style={styles.textInput}
                  placeholder="What's on your mind, trader?"
                  placeholderTextColor={colors.g400}
                  multiline
                  maxLength={MAX_CHARS + 50} // allow slight over-type for UX
                  value={content}
                  onChangeText={setContent}
                  textAlignVertical="top"
                  scrollEnabled={false}
                />

                {/* Sentiment tag (if selected) */}
                {sentiment && (
                  <View style={styles.selectedSentiment}>
                    {SENTIMENTS.filter((s) => s.value === sentiment).map((s) => {
                      const SIcon = s.icon;
                      return (
                        <Pressable
                          key={s.value}
                          style={[
                            styles.sentimentPill,
                            {
                              backgroundColor:
                                s.value === "bullish"
                                  ? "rgba(34,197,94,0.1)"
                                  : s.value === "bearish"
                                    ? "rgba(255,68,68,0.1)"
                                    : colors.g100,
                              borderColor: s.color,
                            },
                          ]}
                          onPress={() => toggleSentiment(s.value)}
                        >
                          <SIcon size={14} color={s.color} />
                          <Text style={[styles.sentimentPillText, { color: s.color }]}>
                            {s.label}
                          </Text>
                          <IconX size={12} color={s.color} />
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* ── Bottom toolbar ── */}
          <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {/* Left: Action buttons */}
            <View style={styles.toolbarLeft}>
              {/* Sentiment picker toggle */}
              <Pressable
                style={[
                  styles.toolbarBtn,
                  showSentiments && styles.toolbarBtnActive,
                ]}
                onPress={() => {
                  triggerHaptic("light");
                  setShowSentiments((v) => !v);
                }}
              >
                <IconTrendUp
                  size={20}
                  color={showSentiments ? colors.lime : colors.g400}
                />
              </Pressable>
            </View>

            {/* Right: character counter */}
            <View style={styles.toolbarRight}>
              {content.length > 0 && (
                <View style={styles.charCounter}>
                  {/* Circular progress */}
                  <Svg width={24} height={24} viewBox="0 0 24 24">
                    {/* Background circle */}
                    <Circle
                      cx={12}
                      cy={12}
                      r={10}
                      stroke={colors.g200}
                      strokeWidth={2.5}
                      fill="none"
                    />
                    {/* Progress arc */}
                    <Circle
                      cx={12}
                      cy={12}
                      r={10}
                      stroke={
                        isOverLimit
                          ? colors.red
                          : isNearLimit
                            ? colors.amber
                            : colors.lime
                      }
                      strokeWidth={2.5}
                      fill="none"
                      strokeDasharray={`${Math.min(charProgress, 1) * 62.83} 62.83`}
                      strokeLinecap="round"
                      transform="rotate(-90 12 12)"
                    />
                  </Svg>
                  {/* Numeric counter near limit */}
                  {isNearLimit && (
                    <Text
                      style={[
                        styles.charCountText,
                        isOverLimit && { color: colors.red },
                      ]}
                    >
                      {charsRemaining}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* ── Sentiment picker drawer ── */}
          {showSentiments && (
            <View style={[styles.sentimentDrawer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              <Text style={styles.sentimentDrawerLabel}>How are you feeling?</Text>
              <View style={styles.sentimentOptions}>
                {SENTIMENTS.map((s) => {
                  const SIcon = s.icon;
                  const isActive = sentiment === s.value;
                  return (
                    <Pressable
                      key={s.value}
                      style={[
                        styles.sentimentOption,
                        isActive && {
                          backgroundColor:
                            s.value === "bullish"
                              ? "rgba(34,197,94,0.12)"
                              : s.value === "bearish"
                                ? "rgba(255,68,68,0.12)"
                                : colors.g100,
                          borderColor: s.color,
                        },
                      ]}
                      onPress={() => {
                        toggleSentiment(s.value);
                        setShowSentiments(false);
                      }}
                    >
                      <SIcon size={20} color={isActive ? s.color : colors.g500} />
                      <Text
                        style={[
                          styles.sentimentOptionText,
                          isActive && { color: s.color, fontFamily: "Outfit_700Bold" },
                        ]}
                      >
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  postBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.g200,
  },
  postBtnActive: {
    backgroundColor: colors.lime,
    borderWidth: 2,
    borderColor: colors.black,
  },
  postBtnText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: colors.g400,
  },
  postBtnTextActive: {
    color: colors.black,
  },

  /* Body */
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexGrow: 1,
  },
  composerRow: {
    flexDirection: "row",
    gap: 12,
  },
  avatarCol: {
    alignItems: "center",
    gap: 4,
  },
  threadLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.g200,
    borderRadius: 1,
    minHeight: 40,
  },
  inputCol: {
    flex: 1,
    paddingTop: 2,
  },
  textInput: {
    fontFamily: "Outfit_400Regular",
    fontSize: 17,
    color: colors.black,
    lineHeight: 24,
    minHeight: 120,
    padding: 0,
  },
  selectedSentiment: {
    flexDirection: "row",
    marginTop: 12,
  },
  sentimentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  sentimentPillText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
  },

  /* Toolbar */
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.g100,
  },
  toolbarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  toolbarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbarBtnActive: {
    backgroundColor: "rgba(168, 255, 57, 0.15)",
  },
  toolbarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  charCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  charCountText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: colors.g500,
  },

  /* Sentiment drawer */
  sentimentDrawer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.g100,
    backgroundColor: colors.g50,
  },
  sentimentDrawerLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: colors.g500,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sentimentOptions: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 8,
  },
  sentimentOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.g200,
    backgroundColor: colors.white,
  },
  sentimentOptionText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: colors.g500,
  },
});
