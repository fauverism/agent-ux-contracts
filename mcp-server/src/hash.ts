import { createHash } from 'node:crypto';

/** Recursively sorts object keys so the hash is independent of key order. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonicalize((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

/** sha256 hex over canonicalized JSON (sorted keys, no whitespace) — see DESIGN.md §5. */
export function contractHash(contract: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(contract)))
    .digest('hex');
}
