export type AmountLocale = "en" | "lt";

const INTL_LOCALE: Record<AmountLocale, string> = {
  en: "en-US",
  lt: "lt-LT",
};

export function formatAmount(value: number, locale: AmountLocale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
