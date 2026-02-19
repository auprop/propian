import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, shadows } from "@/theme";
import { triggerHaptic } from "@/hooks/useHaptics";
import Svg, { Path } from "react-native-svg";
import {
  TRADING_SYMBOLS,
  SYMBOL_CATEGORIES,
  CHART_INTERVALS,
  type TradingSymbol,
  type SymbolCategory,
  type ChartInterval,
} from "@propian/shared/constants";

/* ─── Inline Icons ─── */
function IconX({ size = 22, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconSearch({ size = 18, color = "#a3a3a3" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconChartLine({ size = 18, color = colors.lime }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12l4-4 4 4 4-8 6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconCheck({ size = 14, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ─── Props ─── */
interface ChartPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (data: { exchange: string; symbol: string; interval: ChartInterval }) => void;
}

/* ─── Component ─── */
export function ChartPicker({ visible, onClose, onSelect }: ChartPickerProps) {
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<SymbolCategory>("forex");
  const [selectedSymbol, setSelectedSymbol] = useState<TradingSymbol | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<ChartInterval>("D");

  const filtered = useMemo(() => {
    return TRADING_SYMBOLS.filter((s) => {
      const matchCategory = s.category === category;
      const matchSearch =
        !search ||
        s.symbol.toLowerCase().includes(search.toLowerCase()) ||
        s.name.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [category, search]);

  const handleConfirm = useCallback(() => {
    if (!selectedSymbol) return;
    triggerHaptic("success");
    onSelect({
      exchange: selectedSymbol.exchange,
      symbol: selectedSymbol.symbol,
      interval: selectedInterval,
    });
    setSearch("");
    setSelectedSymbol(null);
    setSelectedInterval("D");
  }, [selectedSymbol, selectedInterval, onSelect]);

  const handleClose = useCallback(() => {
    setSearch("");
    setSelectedSymbol(null);
    setSelectedInterval("D");
    onClose();
  }, [onClose]);

  const renderSymbolItem = useCallback(
    ({ item }: { item: TradingSymbol }) => {
      const isActive = selectedSymbol?.symbol === item.symbol;
      return (
        <Pressable
          style={({ pressed }) => [
            styles.symbolRow,
            isActive && styles.symbolRowActive,
            pressed && !isActive && styles.symbolRowPressed,
          ]}
          onPress={() => {
            triggerHaptic("light");
            setSelectedSymbol(item);
          }}
        >
          {/* Symbol avatar circle */}
          <View style={[styles.symbolAvatar, isActive && styles.symbolAvatarActive]}>
            <Text style={[styles.symbolAvatarText, isActive && styles.symbolAvatarTextActive]}>
              {item.symbol.slice(0, 2)}
            </Text>
          </View>

          {/* Symbol info */}
          <View style={styles.symbolInfo}>
            <Text style={styles.symbolCode}>{item.symbol}</Text>
            <Text style={styles.symbolName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          {/* Check indicator */}
          {isActive && (
            <View style={styles.symbolCheck}>
              <IconCheck size={12} color={colors.white} />
            </View>
          )}
        </Pressable>
      );
    },
    [selectedSymbol],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.root}
      >
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
              <IconX size={20} color={colors.g500} />
            </Pressable>
            <View style={styles.headerCenter}>
              <IconChartLine size={18} color={colors.lime} />
              <Text style={styles.title}>Attach Chart</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          {/* ── Search bar ── */}
          <View style={styles.searchWrapper}>
            <View style={styles.searchBar}>
              <IconSearch size={18} color={colors.g400} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search symbols..."
                placeholderTextColor={colors.g400}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="characters"
                returnKeyType="search"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <IconX size={16} color={colors.g400} />
                </Pressable>
              )}
            </View>
          </View>

          {/* ── Category tabs ── */}
          <View style={styles.tabsContainer}>
            {SYMBOL_CATEGORIES.map((cat) => {
              const isActive = category === cat.value;
              return (
                <Pressable
                  key={cat.value}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => {
                    triggerHaptic("light");
                    setCategory(cat.value);
                    setSelectedSymbol(null);
                    setSearch("");
                  }}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── Symbol list ── */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => `${item.exchange}:${item.symbol}`}
            renderItem={renderSymbolItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <IconSearch size={32} color={colors.g200} />
                <Text style={styles.emptyTitle}>No symbols found</Text>
                <Text style={styles.emptyDesc}>Try a different search or category</Text>
              </View>
            }
          />

          {/* ── Bottom section: Interval + Confirm ── */}
          {selectedSymbol && (
            <View
              style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 20) }]}
            >
              {/* Interval picker */}
              <View style={styles.intervalSection}>
                <Text style={styles.intervalLabel}>Timeframe</Text>
                <View style={styles.intervalRow}>
                  {CHART_INTERVALS.map((iv) => {
                    const isActive = selectedInterval === iv.value;
                    return (
                      <Pressable
                        key={iv.value}
                        style={[styles.intervalChip, isActive && styles.intervalChipActive]}
                        onPress={() => {
                          triggerHaptic("light");
                          setSelectedInterval(iv.value);
                        }}
                      >
                        <Text
                          style={[
                            styles.intervalChipText,
                            isActive && styles.intervalChipTextActive,
                          ]}
                        >
                          {iv.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Confirm button */}
              <Pressable
                style={({ pressed }) => [
                  styles.confirmBtn,
                  pressed && styles.confirmBtnPressed,
                ]}
                onPress={handleConfirm}
              >
                <IconCheck size={16} color={colors.black} />
                <Text style={styles.confirmBtnText}>
                  Attach {selectedSymbol.symbol} Chart
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.g50,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: colors.black,
  },

  /* Search */
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.g50,
    borderRadius: radii.xl,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: colors.black,
    padding: 0,
  },

  /* Category tabs */
  tabsContainer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radii.full,
    backgroundColor: colors.g50,
  },
  tabActive: {
    backgroundColor: colors.black,
  },
  tabText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: colors.g500,
  },
  tabTextActive: {
    color: colors.white,
    fontFamily: "Outfit_700Bold",
  },

  /* Symbol list */
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
  },
  separator: {
    height: 2,
  },
  symbolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  symbolRowActive: {
    backgroundColor: colors.lime10,
  },
  symbolRowPressed: {
    backgroundColor: colors.g50,
  },

  /* Symbol avatar */
  symbolAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.g100,
    alignItems: "center",
    justifyContent: "center",
  },
  symbolAvatarActive: {
    backgroundColor: colors.lime,
  },
  symbolAvatarText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 13,
    color: colors.g500,
  },
  symbolAvatarTextActive: {
    color: colors.black,
  },

  /* Symbol info */
  symbolInfo: {
    flex: 1,
    gap: 2,
  },
  symbolCode: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 15,
    color: colors.black,
    letterSpacing: 0.5,
  },
  symbolName: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g400,
  },
  symbolCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Empty */
  emptyContainer: {
    padding: 48,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: colors.g500,
    marginTop: 4,
  },
  emptyDesc: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: colors.g400,
  },

  /* Bottom section */
  bottomSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.g100,
    backgroundColor: colors.white,
  },

  /* Interval picker */
  intervalSection: {
    marginBottom: 16,
  },
  intervalLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: colors.g400,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  intervalRow: {
    flexDirection: "row",
    gap: 8,
  },
  intervalChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.g50,
  },
  intervalChipActive: {
    backgroundColor: colors.black,
  },
  intervalChipText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 13,
    color: colors.g500,
  },
  intervalChipTextActive: {
    color: colors.white,
  },

  /* Confirm button */
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.lime,
    borderRadius: radii.md,
    paddingVertical: 16,
    ...shadows.sm,
  },
  confirmBtnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  confirmBtnText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: colors.black,
  },
});
