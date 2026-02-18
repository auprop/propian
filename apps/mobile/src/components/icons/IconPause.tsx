import Svg, { Path } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

export function IconPause({ size = 18, color = "#000" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill={color} d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </Svg>
  );
}
