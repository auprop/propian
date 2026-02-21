import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useVerifyOtp, useResendVerification } from "@propian/shared/hooks";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { colors, fontFamily, radii, shadows } from "@/theme";

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const verifyOtp = useVerifyOtp(supabase);
  const resendVerification = useResendVerification(supabase);

  const [code, setCode] = useState(["", "", "", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function handleChange(value: string, index: number) {
    if (value.length > 1) {
      value = value[value.length - 1];
    }
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 7) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handleVerify() {
    const fullCode = code.join("");
    if (fullCode.length < 8) {
      setError("Please enter the full 8-digit code");
      return;
    }
    setError("");
    verifyOtp.mutate(
      { email: email ?? "", token: fullCode },
      {
        onSuccess: () => router.replace("/(tabs)/feed"),
        onError: (err) => setError(err.message || "Invalid verification code"),
      }
    );
  }

  function handleResend() {
    if (cooldown > 0 || !email) return;
    setError("");
    resendVerification.mutate(email, {
      onSuccess: () => setCooldown(60),
      onError: (err) => setError(err.message || "Failed to resend code"),
    });
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.title}>Verify email</Text>
        <Text style={styles.subtitle}>
          Enter the 8-digit code sent to{" "}
          {email ? (
            <Text style={styles.emailHighlight}>{email}</Text>
          ) : (
            "your email"
          )}
        </Text>

        {error !== "" && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.codeRow}>
          {code.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { inputs.current[i] = ref; }}
              style={[styles.codeDigit, digit && styles.codeDigitFilled]}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(v) => handleChange(v, i)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, i)
              }
              selectTextOnFocus
            />
          ))}
        </View>

        <Button
          variant="primary"
          fullWidth
          onPress={handleVerify}
          disabled={verifyOtp.isPending}
        >
          {verifyOtp.isPending ? "Verifying..." : "Verify Email"}
        </Button>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Didn't receive a code? </Text>
          <Pressable onPress={handleResend} disabled={cooldown > 0}>
            <Text style={[styles.footerLink, cooldown > 0 && styles.footerLinkDisabled]}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
            </Text>
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
    marginBottom: 8,
  },
  emailHighlight: {
    fontFamily: "Outfit_600SemiBold",
    color: colors.black,
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
  codeRow: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginVertical: 24,
  },
  codeDigit: {
    width: 38,
    height: 48,
    borderWidth: 2,
    borderColor: colors.g200,
    borderRadius: radii.md,
    textAlign: "center",
    fontSize: 20,
    fontFamily: "JetBrainsMono_500Medium",
    color: colors.black,
  },
  codeDigitFilled: {
    borderColor: colors.black,
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
  footerLinkDisabled: {
    opacity: 0.5,
  },
});
