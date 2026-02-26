import { useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, fontFamily, radii, spacing, shadows } from "@/theme";
import { supabase } from "@/lib/supabase";
import { useSearch } from "@propian/shared/hooks";
import { Avatar, FilterChip, Card, RatingStars, EmptyState, Skeleton } from "@/components/ui";
import { IconSearch } from "@/components/icons/IconSearch";
import { IconVerified } from "@/components/icons/IconVerified";
import { IconClose } from "@/components/icons/IconClose";

type FilterType = "all" | "traders" | "firms" | "posts" | "reviews";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "traders", label: "Traders" },
  { key: "firms", label: "Firms" },
  { key: "posts", label: "Posts" },
  { key: "reviews", label: "Reviews" },
];

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const { query, setQuery, filter, setFilter, results } = useSearch(supabase);

  useEffect(() => {
    // Auto-focus on mount
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  const resultData = results.data as any;
  const items = resultData?.results ?? resultData ?? [];

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      // Trader result
      if (item.type === "trader" || item.username) {
        return (
          <Card
            onPress={() => router.push({ pathname: "/profile/[username]", params: { username: item.username } })}
            style={styles.resultCard}
          >
            <View style={styles.resultRow}>
              <Avatar
                src={item.avatar_url}
                name={item.display_name || ""}
                size="md"
              />
              <View style={styles.resultInfo}>
                <View style={styles.resultNameRow}>
                  <Text style={styles.resultName}>{item.display_name}</Text>
                  {item.is_verified && (
                    <IconVerified size={14} />
                  )}
                </View>
                <Text style={styles.resultHandle}>@{item.username}</Text>
              </View>
            </View>
          </Card>
        );
      }

      // Firm result
      if (item.type === "firm" || item.slug) {
        return (
          <Card
            onPress={() => router.push({ pathname: "/firm/[slug]", params: { slug: item.slug } })}
            style={styles.resultCard}
          >
            <View style={styles.resultRow}>
              <Avatar
                src={item.logo_url}
                name={item.name || ""}
                size="md"
              />
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.name}</Text>
                {item.rating_avg !== undefined && (
                  <RatingStars rating={item.rating_avg} size={12} />
                )}
              </View>
            </View>
          </Card>
        );
      }

      // Post result
      if (item.type === "post" || item.content) {
        return (
          <Card style={styles.resultCard}>
            <Text style={styles.postPreview} numberOfLines={3}>
              {item.content}
            </Text>
            {item.author && (
              <Text style={styles.postAuthor}>
                by @{item.author.username || "user"}
              </Text>
            )}
          </Card>
        );
      }

      // Review result
      if (item.type === "review") {
        return (
          <Card style={styles.resultCard}>
            <Text style={styles.reviewTitle}>{item.title}</Text>
            <Text style={styles.postPreview} numberOfLines={2}>
              {item.body}
            </Text>
          </Card>
        );
      }

      return null;
    },
    [router]
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrapper}>
          <IconSearch size={18} color={colors.g400} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search traders, firms, posts..."
            placeholderTextColor={colors.g400}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <IconClose size={18} color={colors.g400} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      {/* Filter Chips */}
      <View style={styles.chipRow}>
        {FILTERS.map((f) => (
          <FilterChip
            key={f.key}
            label={f.label}
            active={filter === f.key}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </View>

      {/* Results */}
      {results.isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={64} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: any, index: number) => item.id ?? String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            query.length >= 2 ? (
              <EmptyState
                icon={<IconSearch size={40} color={colors.g300} />}
                title="No results found"
                description={`Nothing matched "${query}". Try different keywords.`}
              />
            ) : (
              <EmptyState
                icon={<IconSearch size={40} color={colors.g300} />}
                title="Search Propian"
                description="Find traders, firms, posts, and reviews."
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.g50,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.g100,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    gap: 8,
    height: 44,
    borderWidth: 1,
    borderColor: colors.g200,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.black,
    paddingVertical: 0,
  },
  cancelText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: colors.black,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  listContent: {
    padding: spacing.base,
    paddingTop: 0,
    gap: 8,
    paddingBottom: 100,
  },
  resultCard: {
    marginBottom: 0,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  resultNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resultName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: colors.black,
  },
  resultHandle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g500,
  },
  postPreview: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g600,
    lineHeight: 20,
  },
  postAuthor: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: colors.g400,
    marginTop: 6,
  },
  reviewTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: colors.black,
    marginBottom: 4,
  },
  loadingContainer: {
    padding: spacing.base,
    gap: 10,
  },
});
