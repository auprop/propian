import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii } from "@/theme";
import { triggerHaptic } from "@/hooks/useHaptics";
import { IconRepost } from "@/components/icons/IconRepost";
import { IconQuote } from "@/components/icons/IconQuote";
import Svg, { Path } from "react-native-svg";

function IconChevRight({ size = 16, color = "#a3a3a3" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface RepostMenuProps {
  visible: boolean;
  isReposted: boolean;
  onRepost: () => void;
  onQuote: () => void;
  onClose: () => void;
}

export function RepostMenu({ visible, isReposted, onRepost, onQuote, onClose }: RepostMenuProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Drag handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Repost option */}
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              triggerHaptic("light");
              onRepost();
              onClose();
            }}
          >
            <View style={[styles.iconCircle, isReposted && styles.iconCircleActive]}>
              <IconRepost size={20} color={isReposted ? colors.green : colors.g600} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuLabel, isReposted && styles.menuLabelActive]}>
                {isReposted ? "Undo Repost" : "Repost"}
              </Text>
              <Text style={styles.menuDesc}>
                {isReposted ? "Remove your repost" : "Share to your followers"}
              </Text>
            </View>
            <IconChevRight size={16} color={colors.g300} />
          </Pressable>

          <View style={styles.divider} />

          {/* Quote option */}
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              triggerHaptic("light");
              onQuote();
              onClose();
            }}
          >
            <View style={styles.iconCircle}>
              <IconQuote size={20} color={colors.g600} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuLabel}>Quote</Text>
              <Text style={styles.menuDesc}>Share with your thoughts</Text>
            </View>
            <IconChevRight size={16} color={colors.g300} />
          </Pressable>
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
