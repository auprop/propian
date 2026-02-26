import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, fontFamily, spacing, radii } from "@/theme";
import { supabase } from "@/lib/supabase";
import { useCommunityMembers } from "@propian/shared/hooks";
import { Avatar, Skeleton } from "@/components/ui";
import { IconChevLeft } from "@/components/icons/IconChevLeft";
import { IconVerified } from "@/components/icons/IconVerified";

export default function ChatMembersScreen() {
  const { communityId } = useLocalSearchParams<{ communityId: string }>();
  const router = useRouter();
  const { data: members, isLoading } = useCommunityMembers(supabase, communityId ?? "");

  // Separate online/offline (for now, show all as online since we don't track presence per-member)
  const allMembers = members ?? [];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <IconChevLeft size={22} color={colors.black} />
          </Pressable>
          <Text style={styles.navTitle}>Members</Text>
        </View>
        <View style={{ padding: spacing.base, gap: 16 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Skeleton width={40} height={40} radius={20} />
              <View style={{ gap: 4 }}>
                <Skeleton width={120} height={14} />
                <Skeleton width={80} height={10} />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconChevLeft size={22} color={colors.black} />
        </Pressable>
        <Text style={styles.navTitle}>Members</Text>
        <Text style={styles.navCount}>{allMembers.length} total</Text>
      </View>

      <FlatList
        data={allMembers}
        keyExtractor={(item) => item.user_id ?? item.user?.id ?? String(Math.random())}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.member, pressed && { backgroundColor: colors.g50 }]}
          >
            <Avatar
              src={item.user?.avatar_url}
              name={item.user?.display_name ?? "User"}
              size="md"
              showStatus
              isOnline
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={styles.memberName}>{item.user?.display_name ?? "User"}</Text>
                {item.user?.is_verified && (
                  <IconVerified size={14} />
                )}
              </View>
              <Text style={styles.memberRole}>
                {typeof item.role === "object" && item.role !== null
                  ? item.role.name
                  : "Member"}
              </Text>
            </View>
          </Pressable>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
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
  navTitle: {
    fontSize: 17,
    fontFamily: fontFamily.sans.bold,
    color: colors.black,
    flex: 1,
  },
  navCount: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    color: colors.g400,
  },
  member: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  memberName: {
    fontSize: 15,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
  },
  memberRole: {
    fontSize: 10,
    fontFamily: fontFamily.mono.regular,
    color: colors.g400,
  },
});
