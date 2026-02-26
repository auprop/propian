import { View, Text, type TextStyle, type ViewStyle } from "react-native";

interface IconProProps {
  size?: number;
}

export function IconPro({ size = 14 }: IconProProps) {
  const fontSize = Math.max(7, size - 4);
  const paddingH = Math.max(3, size / 3);
  const paddingV = Math.max(1, size / 7);

  const container: ViewStyle = {
    backgroundColor: "#c8ff00",
    borderRadius: 4,
    paddingHorizontal: paddingH,
    paddingVertical: paddingV,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const text: TextStyle = {
    color: "#0a0a0a",
    fontSize,
    fontWeight: "800",
    letterSpacing: 0.5,
    lineHeight: fontSize + 2,
  };

  return (
    <View style={container}>
      <Text style={text}>PRO</Text>
    </View>
  );
}
