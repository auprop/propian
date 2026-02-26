"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl" | "chat";
  showStatus?: boolean;
  isOnline?: boolean;
}

const sizeClass = { sm: "sm", md: "md", lg: "lg", xl: "xl", chat: "chat" };

export function Avatar({ src, name, size = "md", showStatus, isOnline }: AvatarProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset states when src changes
  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  // After mount, check if the image is already cached (complete).
  // This skips the fade-in for images the browser already has.
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => setErrored(true), []);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Show image if we have a src and it hasn't failed
  const showImg = !!src && !errored;

  return (
    <div className={`pt-av ${sizeClass[size]}${showImg ? " has-img" : ""}`}>
      {showImg ? (
        <img
          ref={imgRef}
          src={src}
          alt={name}
          loading="eager"
          className={`pt-av-img${loaded ? " pt-av-loaded" : ""}`}
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        <span className="pt-av-initials">{initials}</span>
      )}
      {showStatus && <div className={`pt-av-dot ${isOnline ? "online" : ""}`} />}
    </div>
  );
}
