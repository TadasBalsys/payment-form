export type AmountLocale = "en" | "lt";

const INTL_LOCALE: Record<AmountLocale, string> = {
  en: "en-US",
  lt: "lt-LT",
};

// Any kind of space can show up as a grouping separator (lt-LT uses a
// non-breaking or narrow non-breaking space depending on the ICU version).
const WHITESPACE = /[\s  ]/g;

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
 * Edit form: no grouping, no padded zeros, but the locale's decimal separator
 * (e.g. `1000.1` / `1000,1`). Shown while the field has focus so the user is
 * editing a plain number rather than fighting with grouping separators.
 */
export function toEditableAmount(value: number, locale: AmountLocale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    useGrouping: false,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Parses user input back to a number, or `null` if it isn't a number at all.
 *
 * Accepts both `.` and `,` as the decimal separator regardless of locale, since
 * people type whichever their keyboard offers. When both appear the last one
 * wins ("1,000.10" -> 1000.1, "1.000,10" -> 1000.1). A lone separator followed
 * by exactly three digits is genuinely ambiguous ("1,000"), so it's read the
 * way the active locale would read it.
 */
export function parseAmount(
  input: string,
  locale: AmountLocale,
): number | null {
  const compact = input.replace(WHITESPACE, "");
  if (!compact) return null;
  if (!/^-?[\d.,]+$/.test(compact)) return null;

  const lastDot = compact.lastIndexOf(".");
  const lastComma = compact.lastIndexOf(",");

  let decimalSep: string | null = null;

  if (lastDot >= 0 && lastComma >= 0) {
    decimalSep = lastDot > lastComma ? "." : ",";
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? "." : ",";
    const index = lastDot >= 0 ? lastDot : lastComma;
    const occurrences = compact.split(sep).length - 1;
    const digitsAfter = compact.length - index - 1;
    const { group } = getSeparators(locale);

    if (occurrences > 1) {
      decimalSep = null; // repeated -> grouping ("1,000,000")
    } else if (digitsAfter === 3 && sep === group) {
      decimalSep = null; // ambiguous -> the locale reads it as grouping
    } else {
      decimalSep = sep;
    }
  }

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
