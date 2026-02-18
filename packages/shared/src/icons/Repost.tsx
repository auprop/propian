import { SVGProps } from "react";

export function IconRepost({ size = 18, ...props }: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={size} height={size} {...props}>
      <path fill="currentColor" d="m21 24h-13c-.55 0-1-.45-1-1v-13.59l1.29 1.29c.2.2.45.29.71.29s.51-.1.71-.29c.39-.39.39-1.02 0-1.41l-3-3c-.39-.39-1.02-.39-1.41 0l-3 3c-.39.39-.39 1.02 0 1.41s1.02.39 1.41 0l1.29-1.29v13.59c0 1.65 1.35 3 3 3h13c.55 0 1-.45 1-1s-.45-1-1-1z"/>
      <path fill="currentColor" d="m29.71 21.29c-.39-.39-1.02-.39-1.41 0l-1.29 1.29v-13.58c0-1.65-1.35-3-3-3h-13.01c-.55 0-1 .45-1 1s.45 1 1 1h13c.55 0 1 .45 1 1v13.59l-1.29-1.29c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l3 3c.2.2.45.29.71.29s.51-.1.71-.29l3-3c.39-.39.39-1.02 0-1.41z"/>
    </svg>
  );
}
