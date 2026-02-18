import { View, StyleSheet } from "react-native";
import { colors } from "@/theme";
import { IconStar } from "@/components/icons/IconStar";
import { IconStarHalf } from "@/components/icons/IconStarHalf";

interface RatingStarsProps {
  rating: number;
  size?: number;
}

export function RatingStars({ rating, size = 14 }: RatingStarsProps) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <View style={styles.row}>
      {[...Array(full)].map((_, i) => (
        <IconStar key={`f${i}`} size={size} color={colors.lime} />
      ))}
      {half && <IconStarHalf size={size} color={colors.lime} />}
      {[...Array(empty)].map((_, i) => (
        <View key={`e${i}`} style={styles.empty}>
          <IconStar size={size} color={colors.lime} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  empty: {
    opacity: 0.2,
  },
});
