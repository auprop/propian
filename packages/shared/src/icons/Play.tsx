import { SVGProps } from "react";

export function IconPlay({ size = 18, ...props }: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} {...props}>
      <path fill="currentColor" d="M8 5v14l11-7z"/>
    </svg>
  );
}
