/**
 * Normalize a store or item name for matching:
 * NFKC (full-width → half-width, etc.), lowercase, strip whitespace.
 */
export function normalizeText(input: string): string {
  return input.normalize("NFKC").toLowerCase().replace(/\s+/g, "").trim();
}
