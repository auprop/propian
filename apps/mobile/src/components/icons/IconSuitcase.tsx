import Svg, { Path } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

export function IconSuitcase({ size = 18, color = "#000" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill={color} d="m21.5 22h-19c-1.4 0-2.5-1.1-2.5-2.5v-12c0-1.4 1.1-2.5 2.5-2.5h19c1.4 0 2.5 1.1 2.5 2.5v12c0 1.4-1.1 2.5-2.5 2.5zm-19-16c-.8 0-1.5.7-1.5 1.5v12c0 .8.7 1.5 1.5 1.5h19c.8 0 1.5-.7 1.5-1.5v-12c0-.8-.7-1.5-1.5-1.5z" />
      <Path fill={color} d="m15.5 6c-.3 0-.5-.2-.5-.5v-2c0-.3-.2-.5-.5-.5h-5c-.3 0-.5.2-.5.5v2c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-2c0-.8.7-1.5 1.5-1.5h5c.8 0 1.5.7 1.5 1.5v2c0 .3-.2.5-.5.5z" />
      <Path fill={color} d="m12 14c-.1 0-.1 0-.2 0l-11.5-4c-.2-.1-.4-.4-.3-.7.1-.2.4-.4.7-.3l11.3 4 11.3-4c.3-.1.5 0 .6.3s0 .5-.3.6l-11.5 4c0 .1 0 .1-.1.1z" />
    </Svg>
  );
}
