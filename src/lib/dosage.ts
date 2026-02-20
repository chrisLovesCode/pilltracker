/**
 * Dosage formatting helpers used across UI and notifications.
 */

const DOSAGE_UNIT_ALIASES: Record<string, string> = {
  g: 'g',
  mg: 'mg',
  ml: 'ml',
  tablet: 'tablets',
  tablets: 'tablets',
  tablette: 'tablets',
  tabletten: 'tablets',
};

export function normalizeDosageUnitValue(unit: string): string {
  const normalized = String(unit || '').trim().toLowerCase();
  if (!normalized) return unit;
  return DOSAGE_UNIT_ALIASES[normalized] || normalized;
}

function normalizeUnitKey(unit: string): string | null {
  const normalized = normalizeDosageUnitValue(unit);
  return normalized ? normalized : null;
}

export function translateDosageUnit(
  unit: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const normalizedKey = normalizeUnitKey(unit);
  if (!normalizedKey) return unit;

  const translationKey = `units.${normalizedKey}`;
  const translated = t(translationKey);
  return translated === translationKey ? unit : translated;
}
