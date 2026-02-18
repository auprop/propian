import { ScrollView, Pressable, Text, View, StyleSheet } from "react-native";
import { colors, fontFamily, radii, spacing } from "@/theme";
import { IconFire } from "@/components/icons/IconFire";

const TRENDING_TAGS = [
  "FTMO",
  "Funded",
  "Drawdown",
  "Challenge",
  "Payout",
  "Scalping",
  "Gold",
  "EURUSD",
];

interface TrendingBarProps {
  onTagPress?: (tag: string) => void;
}

export function TrendingBar({ onTagPress }: TrendingBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.label}>
        <IconFire size={14} color={colors.lime} />
        <Text style={styles.labelText}>Trending</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TRENDING_TAGS.map((tag) => (
          <Pressable
            key={tag}
            style={styles.tag}
            onPress={() => onTagPress?.(tag)}
          >
            <Text style={styles.tagText}>#{tag}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingLeft: spacing.base,
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
  },
  label: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 10,
  },
  labelText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 12,
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scrollContent: {
    gap: 6,
    paddingRight: spacing.base,
  },
  tag: {
    backgroundColor: colors.g100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.g200,
  },
  tagText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: colors.g700,
  },
});
