import { Image, View } from "react-native";
import { shadows } from "@/theme";

interface IconPropianIconProps {
  size?: number;
}

export function IconPropianIcon({ size = 32 }: IconPropianIconProps) {
  return (
    <View style={shadows.md}>
      <Image
        source={require("../../../assets/propian-icon.png")}
        style={{ width: size, height: size, tintColor: "#00743c" }}
        resizeMode="contain"
      />
    </View>
  );
}
