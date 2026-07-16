/**
 * Normalize user-facing help copy so it never uses dash punctuation.
 * Keeps normal hyphenated words (e.g. "on-premises") intact.
 */
export function withoutDashPunctuation(text: string): string {
  return text
    .replace(/(\d)\s*[—–]\s*(\d)/g, "$1 to $2")
    .replace(/\s*[—–]\s*/g, ". ")
    .replace(/\s+-\s+/g, ". ")
    .replace(/\.\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}
