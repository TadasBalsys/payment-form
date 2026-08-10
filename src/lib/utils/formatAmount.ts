export type AmountLocale = "en" | "lt";

/** Cents are the smallest unit a payment can carry. */
export const MAX_FRACTION_DIGITS = 2;

const INTL_LOCALE: Record<AmountLocale, string> = {
  en: "en-US",
  lt: "lt-LT",
};

// Any kind of space can show up as a grouping separator (lt-LT uses a
// non-breaking or narrow non-breaking space depending on the ICU version).
const WHITESPACE = /[\s  ]/g;

/**
 * Whether the text is something the user could be part-way through typing:
 * digits, separators, and an optional leading minus, nothing else.
 *
 * This is what keeps the field numeric. `<input type="number">` can't be used
 * here — the spec only lets it hold a valid floating-point number, so the
 * browser silently discards the grouped display forms this form has to show
 * ("1,000.01" / "1 000,01"), while still accepting "1e5" as a number.
 */
export function isAmountInput(input: string): boolean {
  return /^-?[\d.,]*$/.test(input.replace(WHITESPACE, ""));
}

type Separators = { group: string; decimal: string };

const separatorCache = new Map<AmountLocale, Separators>();

export function getSeparators(locale: AmountLocale): Separators {
  const cached = separatorCache.get(locale);
  if (cached) return cached;

  const parts = new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: 2,
  }).formatToParts(1234.5);

  const separators: Separators = {
    group: parts.find((p) => p.type === "group")?.value ?? ",",
    decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
  };

  separatorCache.set(locale, separators);
  return separators;
}

/** Display form: grouped, always two decimals (e.g. `1,000.10` / `1 000,10`). */
export function formatAmount(value: number, locale: AmountLocale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Edit form: the display form with the grouping separators taken out
 * (e.g. `1000.10` / `1000,10`). Shown while the field has focus so the user
 * edits a plain number instead of fighting with grouping separators.
 *
 * The cents stay padded on purpose: focusing may only remove grouping, never
 * change a digit. Dropping the trailing zero of `35 212 231,10` reads as the
 * field having quietly lost part of the amount.
 */
export function toEditableAmount(value: number, locale: AmountLocale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    useGrouping: false,
    minimumFractionDigits: MAX_FRACTION_DIGITS,
    maximumFractionDigits: MAX_FRACTION_DIGITS,
  }).format(value);
}

/**
 * Which of `.` / `,` in the input acts as the decimal separator, or `null` when
 * every one of them is grouping.
 *
 * Both are accepted regardless of locale, since people type whichever their
 * keyboard offers. When both appear the last one wins ("1,000.10" -> 1000.1,
 * "1.000,10" -> 1000.1). A lone separator followed by exactly three digits is
 * genuinely ambiguous ("1,000"), so it's read the way the active locale would
 * read it.
 */
function resolveDecimalSeparator(
  compact: string,
  locale: AmountLocale,
): string | null {
  const lastDot = compact.lastIndexOf(".");
  const lastComma = compact.lastIndexOf(",");

  if (lastDot >= 0 && lastComma >= 0) return lastDot > lastComma ? "." : ",";
  if (lastDot < 0 && lastComma < 0) return null;

  const sep = lastDot >= 0 ? "." : ",";
  const index = lastDot >= 0 ? lastDot : lastComma;
  const occurrences = compact.split(sep).length - 1;
  const digitsAfter = compact.length - index - 1;
  const { group } = getSeparators(locale);

  if (occurrences > 1) return null; // repeated -> grouping ("1,000,000")
  if (digitsAfter === 3 && sep === group) return null; // ambiguous -> grouping

  return sep;
}

/**
 * How many digits the input carries after its decimal separator, `0` when it
 * has none. Used to refuse fractions of a cent while typing, so the field never
 * holds a value the display would silently round.
 */
export function countFractionDigits(
  input: string,
  locale: AmountLocale,
): number {
  const compact = input.replace(WHITESPACE, "");
  const decimalSep = resolveDecimalSeparator(compact, locale);
  if (!decimalSep) return 0;

  return compact.length - compact.lastIndexOf(decimalSep) - 1;
}

/** Parses user input back to a number, or `null` if it isn't a number at all. */
export function parseAmount(
  input: string,
  locale: AmountLocale,
): number | null {
  const compact = input.replace(WHITESPACE, "");
  if (!compact) return null;
  if (!/^-?[\d.,]+$/.test(compact)) return null;

  const decimalSep = resolveDecimalSeparator(compact, locale);

  let normalized: string;

  if (decimalSep) {
    const splitAt = compact.lastIndexOf(decimalSep);
    const integerPart = compact.slice(0, splitAt).replace(/[.,]/g, "");
    const fractionPart = compact.slice(splitAt + 1);
    normalized = `${integerPart}.${fractionPart}`;
  } else {
    normalized = compact.replace(/[.,]/g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
