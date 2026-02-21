import { useState, useCallback } from "react";
import {
  View,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fontFamily, radii, spacing, shadows } from "@/theme";
import { supabase } from "@/lib/supabase";
import { useFirms } from "@propian/shared/hooks";
import { firmCategories } from "@propian/shared/constants";
import { Input, FilterChip, EmptyState, Skeleton } from "@/components/ui";
import { FirmCard } from "@/components/firms/FirmCard";
import { IconChart } from "@/components/icons/IconChart";
import { IconChevLeft } from "@/components/icons/IconChevLeft";
import type { Firm, FirmFilter } from "@propian/shared/types";

export default function FirmsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<FirmFilter>({});
  const [activeCategory, setActiveCategory] = useState("All Firms");
  const { data: firms, isLoading, refetch, isRefetching } = useFirms(supabase, filter);

  const handleCategoryPress = useCallback((category: string) => {
    setActiveCategory(category);
    const newFilter: FirmFilter = { ...filter };

    if (category === "All Firms") {
      delete newFilter.category;
      delete newFilter.minRating;
      delete newFilter.sort;
    } else if (category === "High Rating") {
      newFilter.minRating = 4;
      delete newFilter.category;
    } else if (category === "Lowest Fee") {
      newFilter.sort = "fee";
      delete newFilter.category;
    } else if (category === "Best Payout") {
      newFilter.sort = "popularity";
      delete newFilter.category;
    } else {
      newFilter.category = category;
    }
    setFilter(newFilter);
  }, [filter]);

  const handleSearchChange = useCallback((text: string) => {
    setFilter((prev) => ({ ...prev, search: text || undefined }));
  }, []);

  const renderFirm = useCallback(
    ({ item, index }: { item: Firm; index: number }) => (
      <View style={[styles.gridItem, index % 2 === 0 ? styles.gridItemLeft : styles.gridItemRight]}>
        <FirmCard firm={item} />
      </View>
    ),
    []
  );

  const ListHeader = useCallback(() => (
    <View>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search firms..."
          value={filter.search || ""}
          onChangeText={handleSearchChange}
        />
      </View>

      {/* Category Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
        style={styles.chipScrollContainer}
      >
        {firmCategories.map((cat) => (
          <FilterChip
            key={cat}
            label={cat}
            active={activeCategory === cat}
            onPress={() => handleCategoryPress(cat)}
          />
        ))}
      </ScrollView>
    </View>
  ), [filter.search, activeCategory, handleSearchChange, handleCategoryPress]);

  if (isLoading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconChevLeft size={20} color={colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prop Firms</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Skeleton height={48} />
          <View style={styles.chipPlaceholder}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} width={80} height={36} radius={18} />
            ))}
          </View>
          <View style={styles.gridRow}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.skeletonGridItem}>
                <Skeleton height={180} radius={16} />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconChevLeft size={20} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prop Firms</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Grid with search & chips as header */}
      <FlatList
        data={firms ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderFirm}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          <EmptyState
            icon={<IconChart size={40} color={colors.g300} />}
            title="No firms found"
            description="Try adjusting your search or filters."
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.lime}
            colors={[colors.lime]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.g50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamily.sans.bold,
    color: colors.black,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  chipScrollContainer: {
    flexGrow: 0,
  },
  chipScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 16,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: 100,
  },
  gridItem: {
    flex: 1,
    marginBottom: spacing.md,
  },
  gridItemLeft: {
    marginRight: 6,
  },
  gridItemRight: {
    marginLeft: 6,
  },
  loadingContainer: {
    padding: spacing.base,
    gap: 16,
  },
  chipPlaceholder: {
    flexDirection: "row",
    gap: 8,
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  skeletonGridItem: {
    width: "47%",
  },
});
