import { useEffect } from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { colors } from "@/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { IconHome } from "@/components/icons/IconHome";
import { IconSchool } from "@/components/icons/IconSchool";
import { IconNotes } from "@/components/icons/IconNotes";
import { IconChat } from "@/components/icons/IconChat";
import { IconMenu } from "@/components/icons/IconMenu";
import { triggerHaptic } from "@/hooks/useHaptics";
import {
  getRooms,
  getProfileById,
  getFeedPosts,
} from "@propian/shared/api";

export default function TabLayout() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Ensure the tab bar clears the device's bottom safe area (home indicator / nav bar)
  const bottomPadding = Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding; // 56px for icons+labels + safe area

  // Prefetch data for all tabs on mount so switching feels instant
  useEffect(() => {
    if (!user) return;

    queryClient.prefetchInfiniteQuery({
      queryKey: ["feed"],
      queryFn: ({ pageParam }) => getFeedPosts(supabase, pageParam),
      initialPageParam: undefined as string | undefined,
    });
    queryClient.prefetchQuery({
      queryKey: ["chat-rooms"],
      queryFn: () => getRooms(supabase),
    });
    queryClient.prefetchQuery({
      queryKey: ["profile", "me", user.id],
      queryFn: () => getProfileById(supabase, user.id),
    });
  }, [user, queryClient]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          height: tabBarHeight,
          paddingBottom: bottomPadding,
        },
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.g400,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
      screenListeners={{
        tabPress: () => {
          triggerHaptic("light");
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={styles.activeIndicator} />}
              <IconHome size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="academy"
        options={{
          title: "Academy",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={styles.activeIndicator} />}
              <IconSchool size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={styles.activeIndicator} />}
              <IconNotes size={22} color={color} />
            </View>
          ),
        }}
      />
      {/* Hidden tabs — files exist in (tabs)/ but are accessed from the More menu */}
      <Tabs.Screen
        name="firms"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={styles.activeIndicator} />}
              <IconChat size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "More",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={styles.activeIndicator} />}
              <IconMenu size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 2,
    borderTopColor: colors.black,
    paddingTop: 6,
    // height and paddingBottom are set dynamically from safe area insets
  },
  tabLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    marginTop: 4,
  },
  tabItem: {
    gap: 3,
    paddingTop: 4,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: 44,
    height: 28,
  },
  activeIndicator: {
    position: "absolute",
    top: -8,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.lime,
  },
});
