interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export function Skeleton({ width, height, borderRadius, className = "" }: SkeletonProps) {
  return (
    <div
      className={`pt-skeleton ${className}`}
      style={{ width, height, borderRadius }}
    />
  );
}
