"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_STORAGE_KEY,
  translateText,
  type Locale,
} from "@/lib/i18n";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (value: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const TRANSLATABLE_ATTRIBUTES = [
  "aria-label",
  "placeholder",
  "title",
  "alt",
  "content",
];

function isIgnored(node: Node): boolean {
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  return Boolean(element?.closest("[data-i18n-ignore='true']"));
}

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const originalTextRef = useRef(new WeakMap<Text, string>());
  const originalAttributesRef = useRef(
    new WeakMap<Element, Map<string, string>>(),
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) setLocaleState(stored);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "zh" ? "en" : "zh");
  }, [locale, setLocale]);

  const t = useCallback((value: string) => translateText(value, locale), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
    document.documentElement.dataset.locale = locale;
    document
      .querySelector('meta[property="og:locale"]')
      ?.setAttribute("content", locale === "en" ? "en_US" : "zh_CN");

    const originalText = originalTextRef.current;
    const originalAttributes = originalAttributesRef.current;

    const localizeTextNode = (node: Text) => {
      if (isIgnored(node)) return;
      const current = node.nodeValue ?? "";

      if (locale === "zh") {
        const original = originalText.get(node);
        if (original !== undefined && current !== original) node.nodeValue = original;
        return;
      }

      const previousOriginal = originalText.get(node);
      if (
        previousOriginal !== undefined &&
        current === translateText(previousOriginal, "en")
      ) {
        return;
      }
      const translated = translateText(current, "en");
      if (translated !== current) {
        originalText.set(node, current);
        node.nodeValue = translated;
      }
    };

    const localizeElement = (element: Element) => {
      if (isIgnored(element)) return;
      const originals = originalAttributes.get(element) ?? new Map<string, string>();
      for (const attribute of TRANSLATABLE_ATTRIBUTES) {
        const current = element.getAttribute(attribute);
        if (current === null) continue;
        if (locale === "zh") {
          const original = originals.get(attribute);
          if (original !== undefined && current !== original)
            element.setAttribute(attribute, original);
          continue;
        }
        const previousOriginal = originals.get(attribute);
        if (
          previousOriginal !== undefined &&
          current === translateText(previousOriginal, "en")
        ) {
          continue;
        }
        const translated = translateText(current, "en");
        if (translated !== current) {
          originals.set(attribute, current);
          element.setAttribute(attribute, translated);
        }
      }
      if (originals.size) originalAttributes.set(element, originals);
    };

    const localizeTree = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) localizeTextNode(root as Text);
      if (root.nodeType === Node.ELEMENT_NODE) localizeElement(root as Element);
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      );
      let current = walker.nextNode();
      while (current) {
        if (current.nodeType === Node.TEXT_NODE) localizeTextNode(current as Text);
        else localizeElement(current as Element);
        current = walker.nextNode();
      }
    };

    localizeTree(document.head);
    localizeTree(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          localizeTextNode(mutation.target as Text);
        } else if (mutation.type === "attributes") {
          localizeElement(mutation.target as Element);
        } else {
          mutation.addedNodes.forEach(localizeTree);
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRIBUTES,
    });
    return () => observer.disconnect();
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
