import { View, StyleSheet } from "react-native";
import { Skeleton, Card } from "@/components/ui";
import { spacing } from "@/theme";

export function PostSkeleton() {
  return (
    <Card>
      <View style={styles.header}>
        <Skeleton width={40} height={40} radius={20} />
        <View style={styles.headerText}>
          <Skeleton width={120} height={14} />
          <Skeleton width={80} height={12} />
        </View>
      </View>
      <Skeleton width="100%" height={14} style={{ marginTop: 12 }} />
      <Skeleton width="80%" height={14} style={{ marginTop: 6 }} />
      <Skeleton width="60%" height={14} style={{ marginTop: 6 }} />
      <View style={styles.actions}>
        <Skeleton width={40} height={16} />
        <Skeleton width={40} height={16} />
        <Skeleton width={40} height={16} />
        <Skeleton width={40} height={16} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerText: {
    gap: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 24,
    marginTop: 16,
  },
});
