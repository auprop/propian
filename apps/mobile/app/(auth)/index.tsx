import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Animated,
  type GestureResponderEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radii,
  shadows,
} from "@/theme";
import { triggerHaptic } from "@/hooks/useHaptics";

const TOTAL = 4;

/* ─────────────────────── Inline SVG Icons ─────────────────────── */

function IconArrowRight({ size = 14, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M5 13h11.17l-4.88 4.88c-.39.39-.39 1.03 0 1.42s1.02.39 1.41 0l6.59-6.59a.996.996 0 0 0 0-1.41l-6.58-6.6a.996.996 0 1 0-1.41 1.41L16.17 11H5c-.55 0-1 .45-1 1s.45 1 1 1" />
    </Svg>
  );
}

function IconPeople({ size = 18, color = colors.lime }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </Svg>
  );
}

function IconStar({ size = 14, color = colors.lime }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </Svg>
  );
}

function IconSchool({ size = 18, color = colors.lime }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
    </Svg>
  );
}

function IconChart({ size = 18, color = colors.lime }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
    </Svg>
  );
}

function IconBook({ size = 18, color = colors.lime }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
    </Svg>
  );
}

function IconTrophy({ size = 28, color = colors.lime }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z" />
    </Svg>
  );
}

function IconCheck({ size = 12, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </Svg>
  );
}

/* ─────────────────────── Welcome Screen ─────────────────────── */

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [screen, setScreen] = useState(0);
  const [phase, setPhase] = useState(0);

  // Animated values for smooth transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Touch-based swiping
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 80);
    const t2 = setTimeout(() => setPhase(2), 350);
    const t3 = setTimeout(() => setPhase(3), 650);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [screen]);

  const goTo = useCallback(
    (i: number) => {
      triggerHaptic("light");
      setPhase(0);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(() => {
        setScreen(i);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    },
    [fadeAnim],
  );

  const next = useCallback(() => {
    if (screen < TOTAL - 1) goTo(screen + 1);
  }, [screen, goTo]);

  const skip = useCallback(() => goTo(TOTAL - 1), [goTo]);

  const onTouchStart = (e: GestureResponderEvent) => {
    touchStartX.current = e.nativeEvent.pageX;
  };
  const onTouchEnd = (e: GestureResponderEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.nativeEvent.pageX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else if (screen > 0) goTo(screen - 1);
    }
    touchStartX.current = null;
  };

  /* ─── Shared Components ─── */

  const Dots = () => (
    <View style={styles.dotsRow}>
      {Array.from({ length: TOTAL }).map((_, i) => (
        <Pressable key={i} onPress={() => goTo(i)}>
          <View
            style={[
              styles.dot,
              i === screen
                ? styles.dotActive
                : i < screen
                  ? styles.dotVisited
                  : styles.dotInactive,
            ]}
          />
        </Pressable>
      ))}
    </View>
  );

  const CtaButton = ({
    children,
    variant = "lime",
    onPress,
  }: {
    children: React.ReactNode;
    variant?: "lime" | "ghost";
    onPress?: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ctaBase,
        variant === "lime" ? styles.ctaLime : styles.ctaGhost,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {variant === "lime" ? (
        <>
          <Text style={styles.ctaLimeText}>{children}</Text>
          <View style={styles.ctaIconPill}>
            <IconArrowRight size={14} color={colors.lime} />
          </View>
        </>
      ) : (
        <Text style={styles.ctaGhostText}>{children}</Text>
      )}
    </Pressable>
  );

  const FeatureRow = ({
    icon,
    text,
  }: {
    icon: React.ReactNode;
    text: string;
  }) => (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>{icon}</View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );

  const StepLabel = ({ step: s, label }: { step: string; label: string }) => (
    <Text style={styles.stepLabel}>
      {s} <Text style={styles.stepLabelSlash}>/</Text> {label}
    </Text>
  );

  /* ─── Screen 0: Hero ─── */
  const Screen0 = () => (
    <View style={styles.screenInner}>
      {/* Skip */}
      <View style={styles.topBar}>
        <View />
        <Pressable onPress={skip} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Center content */}
      <View style={styles.heroCenter}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: phase >= 1 ? 1 : 0,
              transform: [{ scale: phase >= 1 ? 1 : 0.85 }],
            },
          ]}
        >
          <View style={styles.logoOuter}>
            <View style={styles.logoInner}>
              <Image
                source={require("../../assets/propian-icon.png")}
                style={styles.logoIcon}
                resizeMode="contain"
              />
            </View>
          </View>
        </Animated.View>

        {/* Brand name */}
        <Animated.View
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: [{ translateY: phase >= 1 ? 0 : 10 }],
          }}
        >
          <View style={styles.brandRow}>
            <Text style={styles.brandName}>Propian</Text>
            <View style={styles.brandDot} />
          </View>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text
          style={[
            styles.heroTagline,
            {
              opacity: phase >= 2 ? 1 : 0,
              transform: [{ translateY: phase >= 2 ? 0 : 8 }],
            },
          ]}
        >
          Your prop trading command center.{"\n"}Trade smarter, together.
        </Animated.Text>

        {/* Stats */}
        <Animated.View
          style={[
            styles.statsRow,
            {
              opacity: phase >= 2 ? 1 : 0,
              transform: [{ translateY: phase >= 2 ? 0 : 8 }],
            },
          ]}
        >
          {[
            { v: "12K+", l: "Traders" },
            { v: "180+", l: "Firms" },
            { v: "$4.2M", l: "Tracked" },
          ].map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statValue}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Bottom CTAs */}
      <Animated.View
        style={[
          styles.bottomCta,
          {
            opacity: phase >= 3 ? 1 : 0,
            transform: [{ translateY: phase >= 3 ? 0 : 12 }],
          },
        ]}
      >
        <CtaButton variant="lime" onPress={next}>
          Get Started
        </CtaButton>
        <Dots />
      </Animated.View>
    </View>
  );

  /* ─── Screen 1: Community ─── */
  const Screen1 = () => (
    <View style={styles.screenInner}>
      {/* Header */}
      <View style={styles.topBar}>
        <StepLabel step="01" label="Community" />
        <Pressable onPress={skip} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.contentCenter}>
        <Animated.View
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: [{ translateY: phase >= 1 ? 0 : 10 }],
          }}
        >
          <Text style={styles.screenTitle}>
            Follow Top Traders
            <Text style={styles.titleAccent}>.</Text>
            {"\n"}Compare Prop Firms
            <Text style={styles.titleAccent}>.</Text>
          </Text>
        </Animated.View>

        {/* Trader card */}
        <Animated.View
          style={[
            styles.traderCard,
            {
              opacity: phase >= 2 ? 1 : 0,
              transform: [{ translateY: phase >= 2 ? 0 : 8 }],
            },
          ]}
        >
          <View style={styles.traderAvatar}>
            <Text style={styles.traderAvatarText}>MC</Text>
          </View>
          <View style={styles.traderInfo}>
            <View style={styles.traderNameRow}>
              <Text style={styles.traderName}>Marcus Chen</Text>
              <View style={styles.eliteBadge}>
                <Text style={styles.eliteBadgeText}>Elite</Text>
              </View>
            </View>
            <Text style={styles.traderStats}>72% win rate · +$42,850</Text>
          </View>
          <Text style={styles.traderGain}>+2.4K</Text>
        </Animated.View>

        {/* Firm cards */}
        <Animated.View
          style={[
            styles.firmsRow,
            {
              opacity: phase >= 2 ? 1 : 0,
              transform: [{ translateY: phase >= 2 ? 0 : 8 }],
            },
          ]}
        >
          {[
            { name: "FTMO", logo: "FT", bg: "#2962ff", rating: "4.7" },
            { name: "Funded Next", logo: "FN", bg: "#22c55e", rating: "4.3" },
          ].map((f, i) => (
            <View key={i} style={styles.firmCard}>
              <View style={styles.firmCardHeader}>
                <View style={[styles.firmLogo, { backgroundColor: f.bg }]}>
                  <Text style={styles.firmLogoText}>{f.logo}</Text>
                </View>
                <Text style={styles.firmName}>{f.name}</Text>
              </View>
              <View style={styles.firmRatingRow}>
                <IconStar size={12} color={colors.lime} />
                <Text style={styles.firmRating}>{f.rating}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Features */}
        <Animated.View
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: [{ translateY: phase >= 3 ? 0 : 8 }],
            gap: 10,
            marginTop: 20,
          }}
        >
          <FeatureRow
            icon={<IconPeople size={16} color={colors.lime} />}
            text="Follow & learn from funded traders"
          />
          <FeatureRow
            icon={<IconStar size={16} color={colors.lime} />}
            text="180+ firms rated by real users"
          />
          <FeatureRow
            icon={<IconChart size={16} color={colors.lime} />}
            text="Share setups & trade ideas"
          />
        </Animated.View>
      </View>

      {/* Bottom */}
      <Animated.View
        style={[
          styles.bottomCta,
          {
            opacity: phase >= 3 ? 1 : 0,
            transform: [{ translateY: phase >= 3 ? 0 : 12 }],
          },
        ]}
      >
        <CtaButton variant="lime" onPress={next}>
          Continue
        </CtaButton>
        <Dots />
      </Animated.View>
    </View>
  );

  /* ─── Screen 2: Your Edge ─── */
  const Screen2 = () => (
    <View style={styles.screenInner}>
      {/* Header */}
      <View style={styles.topBar}>
        <StepLabel step="02" label="Your Edge" />
        <Pressable onPress={skip} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.contentCenter}>
        <Animated.View
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: [{ translateY: phase >= 1 ? 0 : 10 }],
          }}
        >
          <Text style={styles.screenTitle}>
            Learn, Journal
            <Text style={styles.titleAccent}>,</Text>
            {"\n"}& Grow
            <Text style={styles.titleAccent}>.</Text>
          </Text>
        </Animated.View>

        {/* Metric cards */}
        <Animated.View
          style={[
            styles.metricsRow,
            {
              opacity: phase >= 2 ? 1 : 0,
              transform: [{ translateY: phase >= 2 ? 0 : 8 }],
            },
          ]}
        >
          {[
            { v: "72%", l: "Win Rate", c: "#22c55e" },
            { v: "2.4", l: "Profit Factor", c: colors.lime },
            { v: "1:2.8", l: "Avg R:R", c: "#3b82f6" },
          ].map((s, i) => (
            <View key={i} style={styles.metricCard}>
              <Text style={[styles.metricValue, { color: s.c }]}>{s.v}</Text>
              <Text style={styles.metricLabel}>{s.l}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Equity curve */}
        <Animated.View
          style={[
            styles.equityCard,
            {
              opacity: phase >= 2 ? 1 : 0,
              transform: [{ translateY: phase >= 2 ? 0 : 8 }],
            },
          ]}
        >
          <View style={styles.equityHeader}>
            <Text style={styles.equityLabel}>EQUITY CURVE</Text>
            <Text style={styles.equityValue}>+$42,850</Text>
          </View>
          <View style={styles.equityBars}>
            {[35, 45, 30, 55, 50, 70, 60, 80, 72, 90, 82, 100].map(
              (h, i) => (
                <View
                  key={i}
                  style={[
                    styles.equityBar,
                    {
                      height: (h / 100) * 56,
                      backgroundColor: h >= 60 ? colors.lime : colors.g200,
                      opacity: phase >= 3 ? 1 : 0.3,
                    },
                  ]}
                />
              ),
            )}
          </View>
        </Animated.View>

        {/* Features */}
        <Animated.View
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: [{ translateY: phase >= 3 ? 0 : 8 }],
            gap: 10,
            marginTop: 20,
          }}
        >
          <FeatureRow
            icon={<IconSchool size={16} color={colors.lime} />}
            text="Courses from funded traders"
          />
          <FeatureRow
            icon={<IconBook size={16} color={colors.lime} />}
            text="Smart trade journal with analytics"
          />
          <FeatureRow
            icon={<IconTrophy size={16} color={colors.lime} />}
            text="Track challenges & payouts"
          />
        </Animated.View>
      </View>

      {/* Bottom */}
      <Animated.View
        style={[
          styles.bottomCta,
          {
            opacity: phase >= 3 ? 1 : 0,
            transform: [{ translateY: phase >= 3 ? 0 : 12 }],
          },
        ]}
      >
        <CtaButton variant="lime" onPress={next}>
          Continue
        </CtaButton>
        <Dots />
      </Animated.View>
    </View>
  );

  /* ─── Screen 3: All Set ─── */
  const Screen3 = () => (
    <View style={styles.screenInner}>
      {/* Spacer for top */}
      <View style={styles.topBar}>
        <View />
        <View />
      </View>

      {/* Center content */}
      <View style={styles.heroCenter}>
        {/* Trophy circle */}
        <Animated.View
          style={[
            styles.trophyCircle,
            {
              opacity: phase >= 1 ? 1 : 0,
              transform: [{ scale: phase >= 1 ? 1 : 0.6 }],
            },
          ]}
        >
          <IconTrophy size={36} color={colors.lime} />
        </Animated.View>

        <Animated.View
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: [{ translateY: phase >= 1 ? 0 : 10 }],
          }}
        >
          <Text style={styles.allSetTitle}>
            You're All Set
            <Text style={styles.titleAccent}>.</Text>
          </Text>
        </Animated.View>

        <Animated.Text
          style={[
            styles.allSetDesc,
            {
              opacity: phase >= 2 ? 1 : 0,
              transform: [{ translateY: phase >= 2 ? 0 : 8 }],
            },
          ]}
        >
          Join thousands of prop traders building their edge on Propian.
        </Animated.Text>

        {/* Feature checklist */}
        <Animated.View
          style={[
            styles.checklistContainer,
            {
              opacity: phase >= 2 ? 1 : 0,
              transform: [{ translateY: phase >= 2 ? 0 : 8 }],
            },
          ]}
        >
          {[
            "Social trading feed",
            "180+ firm reviews & comparison",
            "Trading academy & courses",
            "Smart trade journal",
            "Economic calendar & news",
          ].map((item, i) => (
            <Animated.View
              key={i}
              style={[
                styles.checklistItem,
                {
                  opacity: phase >= 3 ? 1 : 0,
                  transform: [{ translateX: phase >= 3 ? 0 : -8 }],
                },
              ]}
            >
              <View style={styles.checkCircle}>
                <IconCheck size={11} color={colors.black} />
              </View>
              <Text style={styles.checklistText}>{item}</Text>
            </Animated.View>
          ))}
        </Animated.View>
      </View>

      {/* Bottom CTAs */}
      <Animated.View
        style={[
          styles.bottomCtaFinal,
          {
            opacity: phase >= 3 ? 1 : 0,
            transform: [{ translateY: phase >= 3 ? 0 : 12 }],
          },
        ]}
      >
        <CtaButton
          variant="lime"
          onPress={() => router.push("/(auth)/signup")}
        >
          Create Account
        </CtaButton>
        <CtaButton
          variant="ghost"
          onPress={() => router.push("/(auth)/login")}
        >
          I Already Have an Account
        </CtaButton>
        <Dots />
      </Animated.View>
    </View>
  );

  const screens = [Screen0, Screen1, Screen2, Screen3];
  const CurrentScreen = screens[screen];

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
        },
      ]}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Animated.View style={[styles.screenContainer, { opacity: fadeAnim }]}>
        <CurrentScreen />
      </Animated.View>
    </View>
  );
}

/* ─────────────────────── Styles ─────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  screenContainer: {
    flex: 1,
  },
  screenInner: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },

  /* ─── Top Bar ─── */
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  skipText: {
    fontFamily: fontFamily.sans.medium,
    fontSize: fontSize.sm,
    color: colors.g400,
  },
  stepLabel: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 10,
    color: colors.lime,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  stepLabelSlash: {
    color: colors.g300,
  },

  /* ─── Dots ─── */
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingTop: spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.black,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.lime,
  },
  dotVisited: {
    width: 8,
    backgroundColor: colors.g700,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.g200,
  },

  /* ─── CTA Buttons ─── */
  ctaBase: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: colors.black,
  },
  ctaLime: {
    backgroundColor: colors.lime,
    ...shadows.sm,
  },
  ctaGhost: {
    backgroundColor: colors.white,
    borderColor: colors.g300,
  },
  ctaLimeText: {
    fontFamily: fontFamily.sans.bold,
    fontSize: fontSize.md,
    color: colors.black,
    flex: 1,
    textAlign: "center",
  },
  ctaGhostText: {
    fontFamily: fontFamily.sans.semibold,
    fontSize: fontSize.md,
    color: colors.g500,
    textAlign: "center",
    flex: 1,
  },
  ctaIconPill: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },

  /* ─── Bottom CTA area ─── */
  bottomCta: {
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  bottomCtaFinal: {
    gap: 10,
    paddingBottom: spacing.xs,
  },

  /* ─── Screen 0: Hero ─── */
  heroCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    marginBottom: 28,
  },
  logoOuter: {
    width: 72,
    height: 72,
    borderWidth: 2,
    borderColor: "rgba(168, 255, 57, 0.3)",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "45deg" }],
  },
  logoInner: {
    width: 52,
    height: 52,
    backgroundColor: colors.lime,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-45deg" }],
    borderWidth: 2,
    borderColor: colors.black,
  },
  logoIcon: {
    width: 32,
    height: 32,
    tintColor: "#00743c",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  brandName: {
    fontFamily: fontFamily.sans.extrabold,
    fontSize: 36,
    color: colors.black,
    letterSpacing: -1.5,
    lineHeight: 40,
  },
  brandDot: {
    width: 8,
    height: 8,
    backgroundColor: colors.lime,
    borderRadius: radii.full,
    marginLeft: 2,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.black,
  },
  heroTagline: {
    fontFamily: fontFamily.sans.regular,
    fontSize: fontSize.md,
    color: colors.g500,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 260,
  },
  statsRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 28,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 18,
    fontWeight: "800",
    color: colors.black,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: fontFamily.sans.semibold,
    fontSize: 10,
    color: colors.g400,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },

  /* ─── Feature rows ─── */
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.lime10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(168, 255, 57, 0.2)",
  },
  featureText: {
    fontFamily: fontFamily.sans.medium,
    fontSize: fontSize.sm,
    color: colors.g600,
    flex: 1,
  },

  /* ─── Screen 1: Community ─── */
  contentCenter: {
    flex: 1,
    justifyContent: "center",
    gap: 0,
  },
  screenTitle: {
    fontFamily: fontFamily.sans.extrabold,
    fontSize: 28,
    color: colors.black,
    letterSpacing: -1.2,
    lineHeight: 32,
    marginBottom: 20,
  },
  titleAccent: {
    color: colors.lime,
  },

  /* Trader card */
  traderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.g200,
    borderRadius: radii.md,
    marginBottom: 10,
    ...shadows.sm,
  },
  traderAvatar: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.black,
  },
  traderAvatarText: {
    fontFamily: fontFamily.sans.extrabold,
    fontSize: 12,
    color: colors.black,
  },
  traderInfo: {
    flex: 1,
  },
  traderNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  traderName: {
    fontFamily: fontFamily.sans.bold,
    fontSize: fontSize.sm,
    color: colors.black,
  },
  eliteBadge: {
    backgroundColor: colors.lime,
    borderRadius: radii.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.black,
  },
  eliteBadgeText: {
    fontFamily: fontFamily.sans.bold,
    fontSize: 9,
    color: colors.black,
  },
  traderStats: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 11,
    color: colors.g400,
    marginTop: 1,
  },
  traderGain: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 12,
    fontWeight: "700",
    color: colors.green,
  },

  /* Firm cards */
  firmsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 0,
  },
  firmCard: {
    flex: 1,
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.g200,
    borderRadius: radii.md,
    ...shadows.sm,
  },
  firmCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  firmLogo: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  firmLogoText: {
    fontFamily: fontFamily.sans.extrabold,
    fontSize: 10,
    color: colors.white,
  },
  firmName: {
    fontFamily: fontFamily.sans.bold,
    fontSize: 12,
    color: colors.black,
  },
  firmRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  firmRating: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 12,
    fontWeight: "700",
    color: colors.lime,
  },

  /* ─── Screen 2: Your Edge ─── */
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.g200,
    borderRadius: radii.md,
    alignItems: "center",
    ...shadows.sm,
  },
  metricValue: {
    fontFamily: fontFamily.mono.medium,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontFamily: fontFamily.sans.semibold,
    fontSize: 9,
    color: colors.g400,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },

  /* Equity curve card */
  equityCard: {
    padding: 16,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.g200,
    borderRadius: radii.md,
    ...shadows.sm,
  },
  equityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  equityLabel: {
    fontFamily: fontFamily.sans.bold,
    fontSize: 11,
    color: colors.g400,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  equityValue: {
    fontFamily: fontFamily.mono.medium,
    fontSize: fontSize.sm,
    fontWeight: "800",
    color: colors.lime,
  },
  equityBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 56,
  },
  equityBar: {
    flex: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },

  /* ─── Screen 3: All Set ─── */
  trophyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.g50,
    borderWidth: 2,
    borderColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    ...shadows.sm,
  },
  allSetTitle: {
    fontFamily: fontFamily.sans.extrabold,
    fontSize: 30,
    color: colors.black,
    letterSpacing: -1.5,
    lineHeight: 34,
    textAlign: "center",
    marginBottom: 10,
  },
  allSetDesc: {
    fontFamily: fontFamily.sans.regular,
    fontSize: fontSize.md,
    color: colors.g500,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 280,
    marginBottom: 28,
  },

  /* Checklist */
  checklistContainer: {
    width: "100%",
    maxWidth: 300,
    gap: 8,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.g50,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radii.sm,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.black,
  },
  checklistText: {
    fontFamily: fontFamily.sans.medium,
    fontSize: fontSize.sm,
    color: colors.g700,
    flex: 1,
  },
});
