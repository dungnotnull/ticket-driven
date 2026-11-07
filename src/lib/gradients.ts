/**
 * Card header gradient presets for projects. Stored on the project doc as
 * `gradientKey` (null = legacy name-hash cover, every untouched project keeps
 * today's deterministic look). Navy/indigo family first, then a few distinct
 * but tasteful hues so teams can tell projects apart at a glance.
 */

export type ProjectGradient = {
  key: string;
  /** dict key for the human name under the gradient picker (grad.<key>). */
  dictKey: string;
  /** Utility class to apply on the card header strip (and picker swatch). */
  className: string;
};

export const PROJECT_GRADIENTS: readonly ProjectGradient[] = [
  { key: "indigo", dictKey: "grad.indigo", className: "grad-proj-indigo" },
  { key: "ocean", dictKey: "grad.ocean", className: "grad-proj-ocean" },
  { key: "steel", dictKey: "grad.steel", className: "grad-proj-steel" },
  { key: "sky", dictKey: "grad.sky", className: "grad-proj-sky" },
  { key: "teal", dictKey: "grad.teal", className: "grad-proj-teal" },
  { key: "amber", dictKey: "grad.amber", className: "grad-proj-amber" },
  { key: "rose", dictKey: "grad.rose", className: "grad-proj-rose" },
  { key: "emerald", dictKey: "grad.emerald", className: "grad-proj-emerald" },
  { key: "lagoon", dictKey: "grad.lagoon", className: "grad-proj-lagoon" },
  { key: "mist", dictKey: "grad.mist", className: "grad-proj-mist" },
  { key: "midnight", dictKey: "grad.midnight", className: "grad-proj-midnight" },
] as const;

const GRADIENT_KEYS = new Set(PROJECT_GRADIENTS.map((g) => g.key));

/** Server-side allowlist used when persisting a project's gradientKey. */
export function isProjectGradient(key: string): boolean {
  return GRADIENT_KEYS.has(key);
}

/** Class for a stored key (null/unknown -> null so callers fall back). */
export function gradientClassFor(
  gradientKey: string | null | undefined,
): string | null {
  if (!gradientKey) return null;
  return PROJECT_GRADIENTS.find((g) => g.key === gradientKey)?.className ?? null;
}
