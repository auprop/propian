import { Image, View, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors, fontFamily } from "@/theme";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  showStatus?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
}

const sizeMap: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const fontSizeMap: Record<AvatarSize, number> = {
  sm: 12,
  md: 14,
  lg: 20,
  xl: 28,
};

export function Avatar({
  src,
  name = "",
  size = "md",
  showStatus = false,
  isOnline = false,
  style,
}: AvatarProps) {
  const dim = sizeMap[size];
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const dotSize = size === "sm" ? 8 : size === "md" ? 10 : 12;

  return (
    <View
      style={[
        styles.container,
        { width: dim, height: dim, borderRadius: dim / 2 },
        style,
      ]}
    >
      {src ? (
        <Image
          source={{ uri: src }}
          style={[
            styles.image,
            { width: dim, height: dim, borderRadius: dim / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: dim, height: dim, borderRadius: dim / 2 },
          ]}
        >
          <Text style={[styles.initials, { fontSize: fontSizeMap[size] }]}>
            {initials || "?"}
          </Text>
        </View>
      )}
      {showStatus && (
        <View
          style={[
            styles.statusDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: isOnline ? colors.green : colors.g400,
              borderWidth: 2,
              borderColor: colors.white,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "visible",
  },
  image: {
    resizeMode: "cover",
  },
  fallback: {
    backgroundColor: colors.g800,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: "Outfit_700Bold",
    color: colors.white,
  },
  statusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
});
