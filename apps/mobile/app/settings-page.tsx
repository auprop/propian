import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { colors, fontFamily, radii, spacing } from "@/theme";
import { supabase } from "@/lib/supabase";
import {
  useCurrentProfile,
  useUpdateProfile,
  useSignOut,
  usePreferences,
  useUpdatePreferences,
  useUserSubscription,
} from "@propian/shared/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { Input, Textarea, Toggle, Button, Card, Avatar, Skeleton } from "@/components/ui";
import { IconUser } from "@/components/icons/IconUser";
import { IconBell } from "@/components/icons/IconBell";
import { IconLock } from "@/components/icons/IconLock";
import { IconChevLeft } from "@/components/icons/IconChevLeft";
import { IconPro } from "@/components/icons/IconPro";

export default function SettingsPageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile, isLoading } = useCurrentProfile(supabase, user?.id);
  const updateProfile = useUpdateProfile(supabase);
  const signOut = useSignOut(supabase);
  const { data: subscription } = useUserSubscription(supabase);
  const queryClient = useQueryClient();

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  // Preferences (persisted)
  const { data: prefs } = usePreferences(supabase);
  const updatePrefs = useUpdatePreferences(supabase);

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setWebsite(profile.website || "");
      setLocation(profile.location || "");
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile.mutate(
      {
        display_name: displayName,
        username,
        bio,
        website: website || null,
        location: location || null,
      },
      {
        onSuccess: () => {
          Alert.alert("Success", "Profile updated successfully!");
        },
        onError: (err: any) => {
          Alert.alert("Error", err.message || "Failed to update profile");
        },
      }
    );
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          signOut.mutate(undefined, {
            onSuccess: () => {
              router.replace("/(auth)/login");
            },
          });
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is irreversible. All your data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert("Info", "Please contact support to delete your account.");
          },
        },
      ]
    );
  };

  // Subscription helpers
  const proStatus = profile?.pro_subscription_status;
  const isProActive = proStatus === "active" || proStatus === "trialing";
  const isPendingCancel = subscription?.cancel_at_period_end;

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Cancel subscription mutation (calls API with Bearer token)
  const cancelSubMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const apiBase = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiBase}/api/stripe/cancel-subscription`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to cancel subscription");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academy-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      Alert.alert("Subscription Cancelled", "Your subscription will remain active until the end of the current billing period.");
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  // Manage billing (open Stripe portal)
  const manageBillingMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const apiBase = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiBase}/api/stripe/portal`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to open billing portal");
      }

      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: (data) => {
      if (data.url) {
        Linking.openURL(data.url);
      }
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  const handleCancelSubscription = () => {
    const endDate = formatDate(subscription?.current_period_end ?? profile?.pro_expires_at);
    Alert.alert(
      "Cancel Subscription",
      `Are you sure? You'll keep access until ${endDate}. After that, you'll lose access to Pro courses and features.`,
      [
        { text: "Keep Subscription", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => cancelSubMutation.mutate(),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconChevLeft size={20} color={colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Skeleton height={48} />
          <Skeleton height={200} />
          <Skeleton height={200} />
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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconUser size={18} color={colors.black} />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>

          <Card>
            <View style={styles.avatarRow}>
              <Avatar
                src={profile?.avatar_url || undefined}
                name={displayName}
                size="lg"
              />
              <View style={styles.avatarInfo}>
                <Text style={styles.avatarName}>{displayName || "Your Name"}</Text>
                <Text style={styles.avatarHandle}>@{username || "username"}</Text>
              </View>
            </View>

            <View style={styles.formFields}>
              <Input
                label="Display Name"
                placeholder="Your display name"
                value={displayName}
                onChangeText={setDisplayName}
              />
              <Input
                label="Username"
                placeholder="your_username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              <Textarea
                label="Bio"
                placeholder="Tell us about your trading journey..."
                value={bio}
                onChangeText={setBio}
                style={styles.bioInput}
              />
              <Input
                label="Website"
                placeholder="https://yoursite.com"
                value={website}
                onChangeText={setWebsite}
                autoCapitalize="none"
                keyboardType="url"
              />
              <Input
                label="Location"
                placeholder="e.g. New York, US"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <Button
              variant="primary"
              fullWidth
              noIcon
              onPress={handleSave}
              disabled={updateProfile.isPending}
              style={styles.saveButton}
            >
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </Card>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconBell size={18} color={colors.black} />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>

          <Card>
            <Toggle
              label="New Followers"
              description="Get notified when someone follows you"
              value={prefs?.push_follows ?? true}
              onValueChange={(v) => updatePrefs.mutate({ push_follows: v })}
            />
            <View style={styles.toggleDivider} />
            <Toggle
              label="Likes"
              description="Get notified when someone likes your post"
              value={prefs?.push_likes ?? true}
              onValueChange={(v) => updatePrefs.mutate({ push_likes: v })}
            />
            <View style={styles.toggleDivider} />
            <Toggle
              label="Comments"
              description="Get notified when someone comments on your post"
              value={prefs?.push_comments ?? true}
              onValueChange={(v) => updatePrefs.mutate({ push_comments: v })}
            />
            <View style={styles.toggleDivider} />
            <Toggle
              label="Mentions"
              description="Get notified when someone mentions you"
              value={prefs?.push_mentions ?? true}
              onValueChange={(v) => updatePrefs.mutate({ push_mentions: v })}
            />
          </Card>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconLock size={18} color={colors.black} />
            <Text style={styles.sectionTitle}>Privacy</Text>
          </View>

          <Card>
            <Toggle
              label="Private Profile"
              description="Only approved followers can see your posts"
              value={!(prefs?.profile_visible ?? true)}
              onValueChange={(v) => updatePrefs.mutate({ profile_visible: !v })}
            />
            <View style={styles.toggleDivider} />
            <Toggle
              label="Show Trading Stats"
              description="Display your trading statistics on your profile"
              value={prefs?.show_trading_stats ?? true}
              onValueChange={(v) => updatePrefs.mutate({ show_trading_stats: v })}
            />
          </Card>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconPro size={16} />
            <Text style={styles.sectionTitle}>Subscription</Text>
          </View>

          <Card>
            {!subscription && !isProActive ? (
              /* No subscription */
              <View style={{ alignItems: "center", paddingVertical: 8 }}>
                <IconPro size={20} />
                <Text style={[styles.avatarName, { marginTop: 10, textAlign: "center" }]}>
                  No active subscription
                </Text>
                <Text style={[styles.avatarHandle, { marginTop: 4, textAlign: "center", marginBottom: 14 }]}>
                  Subscribe to Pro to unlock all courses and premium features.
                </Text>
                <Button
                  variant="primary"
                  fullWidth
                  noIcon
                  onPress={() => router.push("/academy" as any)}
                >
                  Subscribe to Pro
                </Button>
              </View>
            ) : (
              /* Active / Pending cancel / Cancelled subscription */
              <View>
                {/* Status row */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <IconPro size={16} />
                    <Text style={{ fontFamily: fontFamily.sans.bold, fontSize: 16, color: colors.black }}>
                      {proStatus === "trialing" ? "Trial" : isProActive ? "Active" : proStatus === "canceled" ? "Cancelled" : proStatus === "past_due" ? "Past Due" : "Inactive"}
                    </Text>
                  </View>
                  {isProActive && !isPendingCancel && (
                    <View style={{ backgroundColor: "#c8ff00", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: "#0a0a0a" }}>Active</Text>
                    </View>
                  )}
                  {isPendingCancel && (
                    <View style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: colors.amber }}>Cancelling</Text>
                    </View>
                  )}
                </View>

                {/* Billing date */}
                <View style={styles.toggleDivider} />
                <View style={{ paddingVertical: 12 }}>
                  <Text style={{ fontFamily: fontFamily.sans.semibold, fontSize: 14, color: colors.black }}>
                    {isPendingCancel ? "Access until" : "Next billing date"}
                  </Text>
                  <Text style={{ fontFamily: fontFamily.sans.regular, fontSize: 13, color: colors.g500, marginTop: 2 }}>
                    {isPendingCancel
                      ? `Subscription ends ${formatDate(subscription?.current_period_end ?? profile?.pro_expires_at)}`
                      : formatDate(subscription?.current_period_end ?? profile?.pro_expires_at)}
                  </Text>
                </View>

                {/* Pending cancel warning */}
                {isPendingCancel && (
                  <View style={{
                    marginBottom: 12,
                    padding: 12,
                    borderRadius: radii.md,
                    backgroundColor: "rgba(245, 158, 11, 0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(245, 158, 11, 0.15)",
                  }}>
                    <Text style={{ fontSize: 13, color: colors.amber, fontFamily: fontFamily.sans.medium }}>
                      Your subscription has been cancelled but you'll retain access until the end of the current billing period.
                    </Text>
                  </View>
                )}

                <View style={styles.toggleDivider} />

                {/* Actions */}
                <View style={{ paddingTop: 12, gap: 8 }}>
                  <Button
                    variant="ghost"
                    fullWidth
                    noIcon
                    onPress={() => manageBillingMutation.mutate()}
                    disabled={manageBillingMutation.isPending}
                  >
                    {manageBillingMutation.isPending ? "Opening..." : "Manage Billing"}
                  </Button>

                  {isProActive && !isPendingCancel && (
                    <Button
                      variant="danger"
                      fullWidth
                      noIcon
                      onPress={handleCancelSubscription}
                      disabled={cancelSubMutation.isPending}
                    >
                      {cancelSubMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
                    </Button>
                  )}

                  {proStatus === "canceled" && (
                    <Button
                      variant="primary"
                      fullWidth
                      noIcon
                      onPress={() => router.push("/academy" as any)}
                    >
                      Resubscribe to Pro
                    </Button>
                  )}
                </View>
              </View>
            )}
          </Card>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.dangerTitle}>Danger Zone</Text>
          </View>

          <Card>
            <Button
              variant="ghost"
              fullWidth
              noIcon
              onPress={handleSignOut}
              disabled={signOut.isPending}
            >
              {signOut.isPending ? "Signing out..." : "Sign Out"}
            </Button>

            <View style={styles.dangerDivider} />

            <Button
              variant="danger"
              fullWidth
              noIcon
              onPress={handleDeleteAccount}
            >
              Delete Account
            </Button>
          </Card>
        </View>
      </ScrollView>
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
    backgroundColor: colors.white,
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
    fontFamily: fontFamily.sans.bold,
    fontSize: 18,
    color: colors.black,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: spacing.base,
    paddingTop: 20,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: colors.black,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  avatarInfo: {
    flex: 1,
  },
  avatarName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: colors.black,
  },
  avatarHandle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g500,
    marginTop: 2,
  },
  formFields: {
    gap: 14,
  },
  bioInput: {
    minHeight: 80,
  },
  saveButton: {
    marginTop: 16,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: colors.g100,
  },
  dangerTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: colors.red,
  },
  dangerDivider: {
    height: 1,
    backgroundColor: colors.g100,
    marginVertical: 8,
  },
  loadingContainer: {
    padding: spacing.base,
    gap: 16,
  },
});
