import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { colors } from "@/theme";
import { triggerHaptic } from "@/hooks/useHaptics";
import { IconRepost } from "@/components/icons/IconRepost";
import { IconQuote } from "@/components/icons/IconQuote";

interface RepostMenuProps {
  visible: boolean;
  isReposted: boolean;
  onRepost: () => void;
  onQuote: () => void;
  onClose: () => void;
}

export function RepostMenu({ visible, isReposted, onRepost, onQuote, onClose }: RepostMenuProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.menu}>
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              triggerHaptic("light");
              onRepost();
              onClose();
            }}
          >
            <IconRepost size={20} color={isReposted ? colors.green : colors.black} />
            <Text style={[styles.menuLabel, isReposted && styles.menuLabelActive]}>
              {isReposted ? "Undo Repost" : "Repost"}
            </Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.menuItem}
            onPress={() => {
              triggerHaptic("light");
              onQuote();
              onClose();
            }}
          >
            <IconQuote size={20} color={colors.black} />
            <Text style={styles.menuLabel}>Quote</Text>
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
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  menu: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.black,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 16,
    color: colors.black,
  },
  menuLabelActive: {
    color: colors.green,
  },
  divider: {
    height: 1,
    backgroundColor: colors.g200,
    marginHorizontal: 16,
  },
});
