import Svg, { Path } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

export function IconFlag({ size = 16, color = "#000" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill={color} d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
    </Svg>
  );
}
