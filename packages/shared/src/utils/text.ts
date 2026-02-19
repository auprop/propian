/**
 * Detects whether a string starts with RTL (right-to-left) characters.
 * Covers Arabic, Hebrew, Persian/Farsi, Urdu, Syriac, Thaana, and more.
 */
const RTL_REGEX = /[\u0590-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;

export function isRTLText(text: string | null | undefined): boolean {
  if (!text) return false;
  // Find the first strong directional character
  const trimmed = text.trim();
  if (!trimmed) return false;
  return RTL_REGEX.test(trimmed.charAt(0)) || RTL_REGEX.test(trimmed.slice(0, 10));
}
