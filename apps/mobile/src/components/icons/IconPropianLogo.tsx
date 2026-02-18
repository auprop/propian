import { Image } from "react-native";

interface IconPropianLogoProps {
  height?: number;
}

// Original SVG viewBox: 0 0 150 75 → aspect ratio 2:1
const ASPECT_RATIO = 2;

export function IconPropianLogo({ height = 28 }: IconPropianLogoProps) {
  const width = height * ASPECT_RATIO;

  return (
    <Image
      source={require("../../../assets/propian-logo.png")}
      style={{ width, height }}
      resizeMode="contain"
    />
  );
}
