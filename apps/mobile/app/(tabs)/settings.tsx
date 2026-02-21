import { type ReactNode } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fontFamily, radii, spacing } from "@/theme";
import { supabase } from "@/lib/supabase";
import { triggerHaptic } from "@/hooks/useHaptics";
import { useCurrentProfile } from "@propian/shared/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { Avatar } from "@/components/ui";

// Icons
import { IconSearch } from "@/components/icons/IconSearch";
import { IconCompare } from "@/components/icons/IconCompare";
import { IconNotes } from "@/components/icons/IconNotes";
import { IconChallenges } from "@/components/icons/IconChallenges";
import { IconSuitcase } from "@/components/icons/IconSuitcase";
import { IconChart } from "@/components/icons/IconChart";
import { IconTrophy } from "@/components/icons/IconTrophy";
import { IconStarred } from "@/components/icons/IconStarred";
import { IconInLove } from "@/components/icons/IconInLove";
import { IconRadioAntenna } from "@/components/icons/IconRadioAntenna";
import { IconShield } from "@/components/icons/IconShield";
import { IconUser } from "@/components/icons/IconUser";
import { IconBell } from "@/components/icons/IconBell";
import { IconRefer } from "@/components/icons/IconRefer";
import { IconSettings } from "@/components/icons/IconSettings";
import { IconArrow } from "@/components/icons/IconArrow";

/* ─── Menu Configuration ─── */

interface MenuItem {
  label: string;
  icon: (props: { size: number; color: string }) => ReactNode;
  route: string | null;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    label: "Social",
    items: [
      { label: "Search", icon: IconSearch, route: "/search" },
    ],
  },
  {
    label: "Firms",
    items: [
      { label: "Firms", icon: IconChart, route: "/(tabs)/firms" },
      { label: "Compare", icon: IconCompare, route: "/compare" },
    ],
  },
  {
    label: "Trading",
    items: [
      { label: "Challenges", icon: IconChallenges, route: "/challenges" },
      { label: "Portfolio", icon: IconSuitcase, route: "/portfolio" },
      { label: "Analytics", icon: IconChart, route: "/analytics" },
      { label: "Calendar", icon: IconStarred, route: "/calendar" },
    ],
  },
  {
    label: "Markets",
    items: [
      { label: "Sentiments", icon: IconInLove, route: "/sentiments" },
      { label: "News", icon: IconRadioAntenna, route: "/news" },
    ],
  },
  {
    label: "Compete",
    items: [
      { label: "Leaderboard", icon: IconTrophy, route: "/(tabs)/leaderboard" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", icon: IconUser, route: null },
      { label: "Notifications", icon: IconBell, route: "/notifications" },
      { label: "Referrals", icon: IconRefer, route: "/referrals" },
      { label: "Settings", icon: IconSettings, route: "/settings-page" },
    ],
  },
];

/* ─── Component ─── */

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, user } = useAuth();
  const { data: profile } = useCurrentProfile(supabase, user?.id);

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header as ViewStyle}>
          <Text style={styles.headerTitle as TextStyle}>More</Text>
        </View>

        {/* Profile Card */}
        {session && (
          <TouchableOpacity
            style={styles.profileCard as ViewStyle}
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic("light");
              if (profile?.username) {
                router.push(`/profile/${profile.username}` as any);
              }
            }}
          >
            <Avatar
              src={profile?.avatar_url || undefined}
              name={profile?.display_name || ""}
              size="md"
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName as TextStyle}>
                {profile?.display_name || "Your Name"}
              </Text>
              <Text style={styles.profileHandle as TextStyle}>
                @{profile?.username || "username"}
              </Text>
            </View>
            <IconArrow size={16} color={colors.g400} />
          </TouchableOpacity>
        )}

        {/* Menu Groups */}
        {MENU_GROUPS.map((group) => (
          <View key={group.label} style={styles.group}>
            <Text style={styles.groupLabel as TextStyle}>{group.label}</Text>
            <View style={styles.groupCard as ViewStyle}>
              {group.items.map((item, index) => (
                <TouchableOpacity
                  key={item.route}
                  style={[
                    styles.menuItem as ViewStyle,
                    index < group.items.length - 1 && (styles.menuItemBorder as ViewStyle),
                  ]}
                  activeOpacity={0.6}
                  onPress={() => {
                    triggerHaptic("light");
                    if (item.route === null && profile?.username) {
                      router.push(`/profile/${profile.username}` as any);
                    } else if (item.route) {
                      router.push(item.route as any);
                    }
                  }}
                >
                  <View style={styles.menuIconWrap as ViewStyle}>
                    <item.icon size={18} color={colors.black} />
                  </View>
                  <Text style={styles.menuLabel as TextStyle}>{item.label}</Text>
                  <View style={styles.menuChevron as ViewStyle}>
                    <Text style={styles.chevronText as TextStyle}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.g50,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
  },
  headerTitle: {
    fontFamily: fontFamily.sans.extrabold,
    fontSize: 24,
    color: colors.black,
    letterSpacing: -0.5,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    marginHorizontal: spacing.base,
    marginTop: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.md,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    fontFamily: fontFamily.sans.bold,
    fontSize: 16,
    color: colors.black,
  },
  profileHandle: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 13,
    color: colors.g500,
    marginTop: 1,
  },
  group: {
    marginTop: 20,
    paddingHorizontal: spacing.base,
  },
  groupLabel: {
    fontFamily: fontFamily.sans.bold,
    fontSize: 11,
    color: colors.g400,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.g50,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontFamily: fontFamily.sans.medium,
    fontSize: 15,
    color: colors.black,
  },
  menuChevron: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  chevronText: {
    fontSize: 20,
    color: colors.g400,
    fontFamily: fontFamily.sans.regular,
  },
});
