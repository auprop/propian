import { View, StyleSheet } from "react-native";
import { Skeleton } from "@/components/ui";

export function LeaderboardSkeleton() {
  return (
    <View style={styles.container}>
      {/* Podium placeholders */}
      <View style={styles.podium}>
        <Skeleton width={90} height={120} radius={16} />
        <Skeleton width={90} height={140} radius={16} />
        <Skeleton width={90} height={110} radius={16} />
      </View>
      {/* Row placeholders */}
      {[...Array(5)].map((_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={24} height={14} />
          <Skeleton width={32} height={32} radius={16} />
          <View style={styles.info}>
            <Skeleton width={100} height={14} />
            <Skeleton width={60} height={12} />
          </View>
          <Skeleton width={50} height={14} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  podium: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  info: {
    flex: 1,
    gap: 4,
  },
});
