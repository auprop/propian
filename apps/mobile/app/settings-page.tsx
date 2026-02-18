import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fontFamily, radii, spacing } from "@/theme";
import { supabase } from "@/lib/supabase";
import {
  useCurrentProfile,
  useUpdateProfile,
  useSignOut,
  usePreferences,
  useUpdatePreferences,
} from "@propian/shared/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { Input, Textarea, Toggle, Button, Card, Avatar, Skeleton } from "@/components/ui";
import { IconUser } from "@/components/icons/IconUser";
import { IconBell } from "@/components/icons/IconBell";
import { IconLock } from "@/components/icons/IconLock";

export default function SettingsPageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile, isLoading } = useCurrentProfile(supabase, user?.id);
  const updateProfile = useUpdateProfile(supabase);
  const signOut = useSignOut(supabase);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Preferences (persisted)
  const { data: prefs } = usePreferences(supabase);
  const updatePrefs = useUpdatePreferences(supabase);

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile.mutate(
      {
        display_name: displayName,
        username,
        bio,
        avatar_url: avatarUrl || undefined,
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

  if (isLoading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
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
                src={avatarUrl || undefined}
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
                label="Avatar URL"
                placeholder="https://example.com/avatar.jpg"
                value={avatarUrl}
                onChangeText={setAvatarUrl}
                autoCapitalize="none"
                keyboardType="url"
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
