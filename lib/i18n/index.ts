import dictionary from "./generated-translations.json";

export type Locale = "zh" | "en";

export const LOCALE_STORAGE_KEY = "aiworkbench-locale";
export const DEFAULT_LOCALE: Locale = "zh";

const translations = dictionary as Record<string, string>;
const CJK_PATTERN = /[\u3400-\u9fff]/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const templateTranslations = Object.entries(translations)
  .filter(([source]) => /\{\{\d+\}\}/.test(source))
  .map(([source, target]) => {
    const placeholders = Array.from(source.matchAll(/\{\{(\d+)\}\}/g));
    let pattern = escapeRegExp(source);
    for (const placeholder of placeholders) {
      pattern = pattern.replace(
        escapeRegExp(placeholder[0]),
        "([\\s\\S]*?)",
      );
    }
    return { regex: new RegExp(`^${pattern}$`), target };
  });

/** Translate a complete UI text node while preserving its surrounding whitespace. */
export function translateText(value: string, locale: Locale): string {
  if (locale === "zh" || !CJK_PATTERN.test(value)) return value;

  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const core = value.slice(leading.length, value.length - trailing.length);
  const exact = translations[core];
  if (exact) return `${leading}${exact}${trailing}`;

  for (const { regex, target } of templateTranslations) {
    const match = core.match(regex);
    if (!match) continue;
    const translated = target.replace(/\{\{(\d+)\}\}/g, (_, index: string) => {
      const captured = match[Number(index) + 1] ?? "";
      return translateText(captured, locale);
    });
    return `${leading}${translated}${trailing}`;
  }

  return value;
}

export function isLocale(value: unknown): value is Locale {
  return value === "zh" || value === "en";
}

export function containsChinese(value: string): boolean {
  return CJK_PATTERN.test(value);
}

/** Recursively localize string values in structured demo/trace payloads. */
export function translateValue<T>(value: T, locale: Locale): T {
  if (locale === "zh") return value;
  if (typeof value === "string") return translateText(value, locale) as T;
  if (Array.isArray(value))
    return value.map((item) => translateValue(item, locale)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        translateValue(item, locale),
      ]),
    ) as T;
  }
  return value;
}
