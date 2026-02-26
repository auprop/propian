import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from "@expo-google-fonts/jetbrains-mono";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

// Keep the native splash screen visible until we're fully ready.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  // Resolve auth BEFORE mounting any navigator so the correct initial
  // route is chosen and the login screen never flashes for returning users.
  const [authChecked, setAuthChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setAuthChecked(true);
    });
  }, []);

  // Wait for both fonts AND auth check before rendering anything.
  // The native splash screen stays visible during this time.
  const ready = fontsLoaded && authChecked;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{ headerShown: false }}
            // Set the correct initial route based on auth state so the
            // navigator never briefly renders the wrong screen.
            initialRouteName={hasSession ? "(tabs)" : "(auth)"}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="firm/[slug]"
              options={{
                headerShown: true,
                headerTitle: "Firm Details",
                headerBackTitle: "Back",
              }}
            />
            <Stack.Screen
              name="chat-room/[roomId]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="chat-members"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="chat-search"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="chat-pinned"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="chat-thread/[messageId]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="profile/[username]"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="post/[id]"
              options={{
                headerShown: true,
                headerTitle: "Post",
                headerBackTitle: "Back",
              }}
            />
            <Stack.Screen
              name="search"
              options={{
                headerShown: true,
                headerTitle: "Search",
                headerBackTitle: "Back",
              }}
            />
            <Stack.Screen
              name="notifications"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="settings-page"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="portfolio"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="analytics"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="journal/index"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="journal/log"
              options={{
                headerShown: false,
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="compare"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="sentiments"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="academy"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="referrals"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="onboarding"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="edit-profile"
              options={{
                headerShown: false,
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="chart/[symbol]"
              options={{ headerShown: false }}
            />
          </Stack>
        </AuthProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}
