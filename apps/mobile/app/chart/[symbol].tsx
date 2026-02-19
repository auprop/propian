import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { colors, radii } from "@/theme";
import { parseChartRef, buildFullChartUrl, formatChartLabel } from "@propian/shared/utils";
import Svg, { Path } from "react-native-svg";

/* ─── Inline Icons ─── */
function IconChevLeft({ size = 24, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ChartScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const ref = symbol ? parseChartRef(decodeURIComponent(symbol)) : null;

  if (!ref) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <IconChevLeft size={24} color={colors.black} />
          </Pressable>
          <Text style={styles.navTitle}>Chart</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorBody}>
          <Text style={styles.errorText}>Invalid chart reference</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <IconChevLeft size={24} color={colors.black} />
        </Pressable>
        <Text style={styles.navTitle}>{formatChartLabel(ref)}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Full interactive chart */}
      <WebView
        source={{ uri: buildFullChartUrl(ref) }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.lime} />
            <Text style={styles.loadingText}>Loading chart...</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: colors.black,
  },
  errorBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: colors.g400,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    gap: 12,
  },
  loadingText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: colors.g400,
  },
});
