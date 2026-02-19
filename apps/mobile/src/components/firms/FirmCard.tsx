import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, fontFamily, radii, spacing, shadows } from "@/theme";
import { Avatar, Card, RatingStars, Badge } from "@/components/ui";
import { IconVerifiedFirm } from "@/components/icons/IconVerifiedFirm";
import type { Firm } from "@propian/shared/types";

interface FirmCardProps {
  firm: Firm;
}

export function FirmCard({ firm }: FirmCardProps) {
  const router = useRouter();

  return (
    <Card
      onPress={() => router.push({ pathname: "/firm/[slug]", params: { slug: firm.slug } })}
    >
      <View style={styles.top}>
        <Avatar
          src={firm.logo_url}
          name={firm.name}
          size="lg"
        />
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {firm.name}
          </Text>
          {firm.is_active && (
            <IconVerifiedFirm size={14} />
          )}
        </View>
      </View>

      <View style={styles.ratingRow}>
        <RatingStars rating={firm.rating_avg} size={12} />
      </View>

      <View style={styles.meta}>
        <Text style={styles.reviewCount}>
          {firm.review_count} review{firm.review_count !== 1 ? "s" : ""}
        </Text>
      </View>

      {firm.profit_split && (
        <Badge variant="lime" style={styles.badge}>
          {`${firm.profit_split} split`}
        </Badge>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: {
    alignItems: "center",
    marginBottom: 10,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  name: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: colors.black,
    textAlign: "center",
  },
  ratingRow: {
    alignItems: "center",
  },
  meta: {
    marginTop: 4,
    alignItems: "center",
  },
  reviewCount: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: colors.g500,
  },
  badge: {
    alignSelf: "center",
    marginTop: 8,
  },
});
