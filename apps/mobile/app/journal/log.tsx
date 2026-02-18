import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useLogTrade } from "@propian/shared/hooks";
import { allInstruments } from "@propian/shared/constants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, fontFamily, radii, spacing } from "@/theme";
import { triggerHaptic, triggerSelection } from "@/hooks/useHaptics";

const EMOTIONS = [
  { value: "confident", emoji: "\u{1F60E}", label: "Confident" },
  { value: "neutral", emoji: "\u{1F610}", label: "Neutral" },
  { value: "fearful", emoji: "\u{1F628}", label: "Fearful" },
  { value: "greedy", emoji: "\u{1F911}", label: "Greedy" },
  { value: "revenge", emoji: "\u{1F624}", label: "Revenge" },
] as const;

const SETUPS = [
  "Breakout", "Pullback", "Reversal", "Trend Follow", "Range",
  "Supply/Demand", "Order Block", "FVG", "Liquidity Sweep", "News",
];

const MISTAKES = [
  "Early Entry", "Late Entry", "No Stop Loss", "Moved SL",
  "Over-leveraged", "Revenge Trade", "FOMO", "Ignored Plan",
];

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function ChipButton({
  label,
  selected,
  onPress,
  isMistake,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  isMistake?: boolean;
}) {
  const selectedBg = isMistake ? colors.red : colors.black;
  const selectedColor = isMistake ? colors.white : colors.lime;

  return (
    <TouchableOpacity
      onPress={() => {
        triggerSelection();
        onPress();
      }}
      style={[
        styles.chip,
        selected && { backgroundColor: selectedBg, borderColor: selectedBg },
      ]}
    >
      <Text style={[styles.chipText, selected && { color: selectedColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function LogTradeScreen() {
  const insets = useSafeAreaInsets();
  const logTrade = useLogTrade(supabase);

  // Form state
  const [pair, setPair] = useState("");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [lotSize, setLotSize] = useState("0.01");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [pnl, setPnl] = useState("");
  const [pnlPips, setPnlPips] = useState("");
  const [rrRatio, setRrRatio] = useState("");
  const [status, setStatus] = useState<"closed" | "open" | "breakeven">("closed");
  const [emotion, setEmotion] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [showPairPicker, setShowPairPicker] = useState(false);
  const [pairSearch, setPairSearch] = useState("");

  const filteredInstruments = allInstruments.filter((i) =>
    i.toLowerCase().includes(pairSearch.toLowerCase())
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleMistake = (m: string) => {
    setSelectedMistakes((prev) =>
      prev.includes(m) ? prev.filter((t) => t !== m) : [...prev, m]
    );
  };

  const handleSubmit = () => {
    if (!pair) {
      Alert.alert("Missing pair", "Please select a trading pair.");
      return;
    }
    if (!entryPrice) {
      Alert.alert("Missing entry", "Please enter the entry price.");
      return;
    }

    logTrade.mutate(
      {
        pair,
        direction,
        entry_price: parseFloat(entryPrice),
        exit_price: exitPrice ? parseFloat(exitPrice) : null,
        lot_size: parseFloat(lotSize) || 0.01,
        stop_loss: stopLoss ? parseFloat(stopLoss) : null,
        take_profit: takeProfit ? parseFloat(takeProfit) : null,
        pnl: pnl ? parseFloat(pnl) : null,
        pnl_pips: pnlPips ? parseFloat(pnlPips) : null,
        rr_ratio: rrRatio ? parseFloat(rrRatio) : null,
        commission: 0,
        swap: 0,
        screenshot_url: null,
        notes: notes || null,
        tags: selectedTags,
        setup: selectedTags[0] || null,
        mistakes: selectedMistakes,
        emotion: emotion as any,
        confidence,
        status,
        trade_date: new Date().toISOString().split("T")[0],
        closed_at: status === "closed" ? new Date().toISOString() : null,
      },
      {
        onSuccess: () => {
          triggerHaptic("success");
          router.back();
        },
        onError: (err) => {
          triggerHaptic("error");
          Alert.alert("Error", err.message);
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.white }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerCancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Trade</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={logTrade.isPending}>
          <Text style={[styles.headerSave, logTrade.isPending && { opacity: 0.5 }]}>
            {logTrade.isPending ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {/* Pair */}
        <SectionTitle>Trading Pair</SectionTitle>
        <TouchableOpacity
          style={styles.pairPicker}
          onPress={() => setShowPairPicker(!showPairPicker)}
        >
          <Text style={[styles.pairPickerText, !pair && { color: colors.g400 }]}>
            {pair || "Select pair..."}
          </Text>
        </TouchableOpacity>
        {showPairPicker && (
          <View style={styles.pairDropdown}>
            <TextInput
              style={styles.pairSearchInput}
              placeholder="Search..."
              value={pairSearch}
              onChangeText={setPairSearch}
            />
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
              {filteredInstruments.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.pairOption, pair === p && { backgroundColor: colors.lime10 }]}
                  onPress={() => { setPair(p); setShowPairPicker(false); setPairSearch(""); }}
                >
                  <Text style={[styles.pairOptionText, pair === p && { fontFamily: fontFamily.sans.bold }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Direction */}
        <SectionTitle>Direction</SectionTitle>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <TouchableOpacity
            style={[styles.dirBtn, direction === "long" && { backgroundColor: colors.green, borderColor: colors.green }]}
            onPress={() => { triggerSelection(); setDirection("long"); }}
          >
            <Text style={[styles.dirBtnText, direction === "long" && { color: colors.white }]}>LONG</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dirBtn, direction === "short" && { backgroundColor: colors.red, borderColor: colors.red }]}
            onPress={() => { triggerSelection(); setDirection("short"); }}
          >
            <Text style={[styles.dirBtnText, direction === "short" && { color: colors.white }]}>SHORT</Text>
          </TouchableOpacity>
        </View>

        {/* Price Inputs */}
        <SectionTitle>Price Levels</SectionTitle>
        <View style={styles.inputRow}>
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>Entry</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" value={entryPrice} onChangeText={setEntryPrice} placeholder="0.00" />
          </View>
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>Exit</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" value={exitPrice} onChangeText={setExitPrice} placeholder="0.00" />
          </View>
        </View>
        <View style={styles.inputRow}>
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>Stop Loss</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" value={stopLoss} onChangeText={setStopLoss} placeholder="0.00" />
          </View>
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>Take Profit</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" value={takeProfit} onChangeText={setTakeProfit} placeholder="0.00" />
          </View>
        </View>
        <View style={styles.inputRow}>
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>Lot Size</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" value={lotSize} onChangeText={setLotSize} />
          </View>
          <View style={styles.inputHalf} />
        </View>

        {/* Results */}
        <SectionTitle>Results</SectionTitle>
        <View style={styles.inputRow}>
          <View style={styles.inputThird}>
            <Text style={styles.inputLabel}>P&L ($)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={pnl} onChangeText={setPnl} placeholder="0.00" />
          </View>
          <View style={styles.inputThird}>
            <Text style={styles.inputLabel}>Pips</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={pnlPips} onChangeText={setPnlPips} placeholder="0.0" />
          </View>
          <View style={styles.inputThird}>
            <Text style={styles.inputLabel}>R:R</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" value={rrRatio} onChangeText={setRrRatio} placeholder="0.00" />
          </View>
        </View>

        {/* Status */}
        <SectionTitle>Status</SectionTitle>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
          {(["closed", "open", "breakeven"] as const).map((s) => (
            <ChipButton key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} selected={status === s} onPress={() => setStatus(s)} />
          ))}
        </View>

        {/* Setup Tags */}
        <SectionTitle>Setup</SectionTitle>
        <View style={styles.chipRow}>
          {SETUPS.map((s) => (
            <ChipButton key={s} label={s} selected={selectedTags.includes(s)} onPress={() => toggleTag(s)} />
          ))}
        </View>

        {/* Mistakes */}
        <SectionTitle>Mistakes</SectionTitle>
        <View style={styles.chipRow}>
          {MISTAKES.map((m) => (
            <ChipButton key={m} label={m} selected={selectedMistakes.includes(m)} onPress={() => toggleMistake(m)} isMistake />
          ))}
        </View>

        {/* Emotion */}
        <SectionTitle>How did you feel?</SectionTitle>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
          {EMOTIONS.map((e) => (
            <TouchableOpacity
              key={e.value}
              onPress={() => { triggerSelection(); setEmotion(emotion === e.value ? null : e.value); }}
              style={[
                styles.emotionBtn,
                emotion === e.value && { borderColor: colors.lime, backgroundColor: colors.lime10 },
              ]}
            >
              <Text style={{ fontSize: 22 }}>{e.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Confidence */}
        <SectionTitle>Confidence</SectionTitle>
        <View style={{ flexDirection: "row", gap: 4, marginBottom: 20 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setConfidence(confidence === i ? null : i)}
              style={[
                styles.confSeg,
                (confidence ?? 0) >= i && { backgroundColor: colors.lime },
              ]}
            />
          ))}
        </View>

        {/* Notes */}
        <SectionTitle>Notes</SectionTitle>
        <TextInput
          style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="What did you learn from this trade?"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
    backgroundColor: colors.white,
  },
  headerCancel: {
    fontSize: 15,
    fontFamily: fontFamily.sans.medium,
    color: colors.g500,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: fontFamily.sans.bold,
    color: colors.black,
  },
  headerSave: {
    fontSize: 15,
    fontFamily: fontFamily.sans.bold,
    color: colors.lime,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fontFamily.sans.bold,
    color: colors.black,
    marginBottom: 10,
    marginTop: 4,
  },
  pairPicker: {
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 16,
    backgroundColor: colors.white,
  },
  pairPickerText: {
    fontSize: 15,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
  },
  pairDropdown: {
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.sm,
    marginBottom: 16,
    overflow: "hidden",
  },
  pairSearchInput: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
    fontSize: 14,
    fontFamily: fontFamily.sans.regular,
  },
  pairOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  pairOptionText: {
    fontSize: 14,
    fontFamily: fontFamily.sans.medium,
    color: colors.black,
  },
  dirBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  dirBtnText: {
    fontSize: 14,
    fontFamily: fontFamily.sans.bold,
    color: colors.black,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  inputHalf: {
    flex: 1,
  },
  inputThird: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: fontFamily.sans.semibold,
    color: colors.g400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.sm,
    padding: 10,
    fontSize: 14,
    fontFamily: fontFamily.mono.regular,
    color: colors.black,
    backgroundColor: colors.white,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: 999,
    backgroundColor: colors.white,
  },
  chipText: {
    fontSize: 12,
    fontFamily: fontFamily.sans.semibold,
    color: colors.black,
  },
  emotionBtn: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radii.sm,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
  },
  confSeg: {
    flex: 1,
    height: 12,
    borderRadius: 3,
    backgroundColor: colors.g200,
  },
});
