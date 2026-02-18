import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, fontFamily, radii, spacing, shadows } from "@/theme";
import { supabase } from "@/lib/supabase";
import { useCurrentProfile } from "@propian/shared/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { Button, Card, Toggle } from "@/components/ui";
import { IconCheck } from "@/components/icons/IconCheck";
import { IconTrophy } from "@/components/icons/IconTrophy";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const EXPERIENCE_LEVELS = [
  {
    id: "beginner",
    label: "Beginner",
    description: "New to trading",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "1-2 years experience",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "3-5 years experience",
  },
  {
    id: "expert",
    label: "Expert",
    description: "5+ years experience",
  },
];

const GOALS = [
  "Pass a Challenge",
  "Grow a Funded Account",
  "Learn Risk Management",
  "Connect with Traders",
  "Find the Best Firm",
  "Improve Win Rate",
];

const FIRMS_LIST = [
  { id: "ftmo", name: "FTMO" },
  { id: "mff", name: "MyForexFunds" },
  { id: "tfn", name: "The Funded Trader" },
  { id: "e8", name: "E8 Funding" },
  { id: "5ers", name: "The 5%ers" },
  { id: "surge", name: "SurgeTrader" },
];

const TOTAL_STEPS = 5;

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useCurrentProfile(supabase, user?.id);

  const [step, setStep] = useState(0);
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedFirms, setSelectedFirms] = useState<string[]>([]);
  const [alertFollowers, setAlertFollowers] = useState(true);
  const [alertPosts, setAlertPosts] = useState(true);
  const [alertFirms, setAlertFirms] = useState(true);
  const [alertLeaderboard, setAlertLeaderboard] = useState(false);

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const toggleFirm = (firmId: string) => {
    setSelectedFirms((prev) =>
      prev.includes(firmId) ? prev.filter((f) => f !== firmId) : [...prev, firmId]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return experienceLevel !== null;
      case 1:
        return selectedGoals.length > 0;
      case 2:
        return true; // Firms selection is optional
      case 3:
        return true; // Alerts are optional
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      // Complete onboarding
      router.replace("/(tabs)/feed");
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Progress Dots */}
      <View style={styles.progressRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i <= step ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1: Experience Level */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What's your experience level?</Text>
            <Text style={styles.stepDescription}>
              This helps us personalize your feed and recommendations.
            </Text>
            <View style={styles.optionsGrid}>
              {EXPERIENCE_LEVELS.map((level) => (
                <Pressable
                  key={level.id}
                  style={[
                    styles.optionCard,
                    experienceLevel === level.id && styles.optionCardActive,
                  ]}
                  onPress={() => setExperienceLevel(level.id)}
                >
                  <View style={styles.optionCheckRow}>
                    <Text style={styles.optionLabel}>{level.label}</Text>
                    {experienceLevel === level.id && (
                      <View style={styles.optionCheck}>
                        <IconCheck size={14} color={colors.black} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.optionDesc}>{level.description}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Step 2: Goals */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What are your goals?</Text>
            <Text style={styles.stepDescription}>
              Select all that apply. We'll curate content around these.
            </Text>
            <View style={styles.goalsGrid}>
              {GOALS.map((goal) => {
                const isSelected = selectedGoals.includes(goal);
                return (
                  <Pressable
                    key={goal}
                    style={[
                      styles.goalChip,
                      isSelected && styles.goalChipActive,
                    ]}
                    onPress={() => toggleGoal(goal)}
                  >
                    {isSelected && (
                      <IconCheck size={14} color={colors.black} />
                    )}
                    <Text
                      style={[
                        styles.goalChipText,
                        isSelected && styles.goalChipTextActive,
                      ]}
                    >
                      {goal}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 3: Preferred Firms */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Any preferred firms?</Text>
            <Text style={styles.stepDescription}>
              Select firms you're interested in. You can change this later.
            </Text>
            <View style={styles.firmsGrid}>
              {FIRMS_LIST.map((firm) => {
                const isSelected = selectedFirms.includes(firm.id);
                return (
                  <Pressable
                    key={firm.id}
                    style={[
                      styles.firmCard,
                      isSelected && styles.firmCardActive,
                    ]}
                    onPress={() => toggleFirm(firm.id)}
                  >
                    <View style={styles.firmIconPlaceholder}>
                      <Text style={styles.firmInitial}>
                        {firm.name[0]}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.firmName,
                        isSelected && styles.firmNameActive,
                      ]}
                    >
                      {firm.name}
                    </Text>
                    {isSelected && (
                      <View style={styles.firmCheck}>
                        <IconCheck size={12} color={colors.black} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 4: Alert Preferences */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Notification preferences</Text>
            <Text style={styles.stepDescription}>
              Choose what you want to be notified about.
            </Text>
            <Card>
              <Toggle
                label="New Followers"
                description="When someone follows you"
                value={alertFollowers}
                onValueChange={setAlertFollowers}
              />
              <View style={styles.toggleDivider} />
              <Toggle
                label="Post Interactions"
                description="Likes, comments, and shares on your posts"
                value={alertPosts}
                onValueChange={setAlertPosts}
              />
              <View style={styles.toggleDivider} />
              <Toggle
                label="Firm Updates"
                description="New reviews and updates from followed firms"
                value={alertFirms}
                onValueChange={setAlertFirms}
              />
              <View style={styles.toggleDivider} />
              <Toggle
                label="Leaderboard Changes"
                description="When your ranking changes"
                value={alertLeaderboard}
                onValueChange={setAlertLeaderboard}
              />
            </Card>
          </View>
        )}

        {/* Step 5: Complete */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <View style={styles.completeContainer}>
              <View style={styles.completeIcon}>
                <IconTrophy size={48} color={colors.lime} />
              </View>
              <Text style={styles.completeTitle}>You're all set!</Text>
              <Text style={styles.completeDescription}>
                Welcome to Propian, {profile?.display_name || "trader"}. Your
                personalized feed is ready. Connect with traders, review
                firms, and climb the leaderboard.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        {step > 0 ? (
          <Button variant="ghost" noIcon onPress={handleBack}>
            Back
          </Button>
        ) : (
          <View />
        )}
        <Button
          variant="primary"
          noIcon
          onPress={handleNext}
          disabled={!canProceed()}
        >
          {step === TOTAL_STEPS - 1 ? "Get Started" : "Next"}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: spacing.base,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.black,
  },
  dotActive: {
    backgroundColor: colors.lime,
  },
  dotInactive: {
    backgroundColor: colors.g200,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  stepContainer: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  stepTitle: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 24,
    color: colors.black,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  stepDescription: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: colors.g500,
    lineHeight: 22,
    marginBottom: 28,
  },
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: colors.g50,
    borderWidth: 2,
    borderColor: colors.g200,
    borderRadius: radii.lg,
    padding: 18,
  },
  optionCardActive: {
    backgroundColor: colors.lime10,
    borderColor: colors.lime,
  },
  optionCheckRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  optionLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: colors.black,
  },
  optionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.black,
  },
  optionDesc: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g500,
  },
  goalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  goalChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.g100,
    borderWidth: 2,
    borderColor: colors.g200,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  goalChipActive: {
    backgroundColor: colors.lime25,
    borderColor: colors.lime,
  },
  goalChipText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: colors.g600,
  },
  goalChipTextActive: {
    color: colors.black,
  },
  firmsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  firmCard: {
    width: (SCREEN_WIDTH - spacing.xl * 2 - 12) / 2,
    backgroundColor: colors.g50,
    borderWidth: 2,
    borderColor: colors.g200,
    borderRadius: radii.lg,
    padding: 16,
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  firmCardActive: {
    backgroundColor: colors.lime10,
    borderColor: colors.lime,
  },
  firmIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.g800,
    alignItems: "center",
    justifyContent: "center",
  },
  firmInitial: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 20,
    color: colors.white,
  },
  firmName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: colors.g700,
    textAlign: "center",
  },
  firmNameActive: {
    color: colors.black,
  },
  firmCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.black,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: colors.g100,
  },
  completeContainer: {
    alignItems: "center",
    paddingTop: spacing["4xl"],
  },
  completeIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.g900,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.lime,
    marginBottom: 24,
    ...shadows.md,
  },
  completeTitle: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 28,
    color: colors.black,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  completeDescription: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: colors.g500,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: spacing.base,
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    borderTopWidth: 2,
    borderTopColor: colors.black,
    backgroundColor: colors.white,
  },
});
