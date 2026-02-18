import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@propian/shared/validation";
import { signIn } from "@propian/shared/api";
import { supabase } from "@/lib/supabase";
import { Button, Input, SocialButton } from "@/components/ui";
import { colors, fontFamily, radii, spacing, shadows, borders } from "@/theme";

export default function LoginScreen() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    setError("");
    try {
      await signIn(supabase, data.email, data.password);
      router.replace("/(tabs)/feed");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "discord") {
    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: "propian://auth/callback",
        },
      });
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Sign in to connect with prop traders worldwide.
        </Text>

        {error !== "" && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="you@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="••••••••"
                secureTextEntry
                autoComplete="password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />

          <View style={styles.row}>
            <Pressable onPress={() => router.push("/(auth)/forgot-password")}>
              <Text style={styles.forgotLink}>Forgot?</Text>
            </Pressable>
          </View>

          <Button
            variant="primary"
            fullWidth
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialButtons}>
          <SocialButton label="Google" onPress={() => handleOAuth("google")} />
          <SocialButton
            label="Discord"
            onPress={() => handleOAuth("discord")}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => router.push("/(auth)/signup")}>
            <Text style={styles.footerLink}>Sign up</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.lg,
    padding: 28,
    ...shadows.sm,
  },
  title: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 24,
    color: colors.black,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: colors.g500,
    lineHeight: 21,
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: colors.redBg,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: colors.red,
  },
  form: {
    gap: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  forgotLink: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: colors.black,
    borderBottomWidth: 2,
    borderBottomColor: colors.lime,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.g200,
  },
  dividerText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    color: colors.g400,
    letterSpacing: 1,
  },
  socialButtons: {
    gap: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g500,
  },
  footerLink: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: colors.black,
    borderBottomWidth: 2,
    borderBottomColor: colors.lime,
  },
});
