import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, fontFamily, spacing, radii } from "@/theme";
import { IconChevLeft } from "@/components/icons/IconChevLeft";

const FILTERS = ["All", "Messages", "Files", "Images", "Links"];

export default function ChatSearchScreen() {
  const { communityId, roomId } = useLocalSearchParams<{
    communityId?: string;
    roomId?: string;
  }>();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <SafeAreaView style={styles.safe}>
      {/* Nav */}
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconChevLeft size={22} color={colors.black} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor={colors.g400}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === f && styles.filterTextActive,
              ]}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Results placeholder */}
      <View style={styles.body}>
        {!query ? (
          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>
              Search messages, files, and more
            </Text>
          </View>
        ) : (
          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>
              No results for &quot;{query}&quot;
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
  },
  backBtn: { padding: 4 },
  searchInput: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 14,
    color: colors.black,
    borderWidth: 2,
    borderColor: colors.g200,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filters: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: 99,
  },
  filterChipActive: {
    borderColor: colors.black,
    backgroundColor: colors.lime,
  },
  filterText: {
    fontSize: 12,
    fontFamily: fontFamily.sans.semibold,
    color: colors.g500,
  },
  filterTextActive: {
    color: colors.black,
  },
  body: { flex: 1 },
  hintContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 100,
  },
  hintText: {
    fontSize: 14,
    fontFamily: fontFamily.sans.regular,
    color: colors.g400,
  },
});
