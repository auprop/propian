import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@propian/shared/validation";
import { resetPassword } from "@propian/shared/api";
import { supabase } from "@/lib/supabase";
import { Button, Input } from "@/components/ui";
import { colors, radii, shadows } from "@/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setLoading(true);
    setError("");
    try {
      await resetPassword(supabase, data.email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a reset link.
        </Text>

        {error !== "" && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Check your email for a password reset link.
            </Text>
          </View>
        ) : (
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

            <Button
              variant="primary"
              fullWidth
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </View>
        )}

        <View style={styles.footer}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.footerLink}>← Back to Sign In</Text>
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
  successBox: {
    backgroundColor: colors.lime10,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  successText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: colors.black,
  },
  form: {
    gap: 14,
  },
  footer: {
    alignItems: "center",
    marginTop: 24,
  },
  footerLink: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: colors.black,
  },
});
