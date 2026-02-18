import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui";
import { colors, fontFamily, radii, shadows } from "@/theme";

export default function VerifyScreen() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  function handleChange(value: string, index: number) {
    if (value.length > 1) {
      value = value[value.length - 1];
    }
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      setError("Please enter the full 6-digit code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Verify code logic would go here
      router.replace("/(tabs)/feed");
    } catch (err: any) {
      setError(err.message || "Invalid code");
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
        <Text style={styles.title}>Verify email</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to your email.
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
          disabled={loading}
        >
          {loading ? "Verifying..." : "Verify Email"}
        </Button>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Didn't receive a code? </Text>
          <Pressable>
            <Text style={styles.footerLink}>Resend</Text>
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
    gap: 8,
    justifyContent: "center",
    marginVertical: 24,
  },
  codeDigit: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: colors.g200,
    borderRadius: radii.md,
    textAlign: "center",
    fontSize: 24,
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
});
