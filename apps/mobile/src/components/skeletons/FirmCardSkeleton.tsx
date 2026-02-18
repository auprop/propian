import { View, StyleSheet } from "react-native";
import { Skeleton, Card } from "@/components/ui";

export function FirmCardSkeleton() {
  return (
    <Card>
      <View style={styles.row}>
        <Skeleton width={48} height={48} radius={24} />
        <View style={styles.info}>
          <Skeleton width={100} height={14} />
          <Skeleton width={80} height={12} />
        </View>
      </View>
      <Skeleton width="60%" height={12} style={{ marginTop: 12 }} />
      <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  info: {
    gap: 4,
    flex: 1,
  },
});
