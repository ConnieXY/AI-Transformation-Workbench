"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { useLanguage } from "./i18n/LanguageProvider";

/** 全站统一的顶部导航入口。 */
const navLinks = [
  { href: "/", label: "首页" },
  { href: "/diagnosis", label: "企业诊断" },
  { href: "/solution-builder", label: "行业方案" },
  { href: "/manufacturing-demo", label: "制造业 Demo" },
  { href: "/traces", label: "Trace" },
  { href: "/about", label: "项目说明" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** 顶部导航：品牌标识 + 统一入口 + 主行动按钮，当前页高亮。 */
export default function Navbar() {
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const { locale, toggleLocale } = useLanguage();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6">
        <div className="flex flex-none items-center gap-2.5">
          <Logo />
        </div>

        <nav className="hidden flex-1 grid-cols-6 items-center gap-1 xl:grid">
          {navLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-md px-2 py-2 text-center text-xs font-medium transition-colors ${
                  active
                    ? "bg-slate-100 text-ink-900"
                    : "text-ink-500 hover:bg-slate-100 hover:text-ink-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={
              locale === "zh" ? "切换为英文" : "Switch to Chinese"
            }
            title={locale === "zh" ? "切换为英文" : "Switch to Chinese"}
            data-i18n-ignore="true"
            className="inline-flex h-9 min-w-[4.5rem] items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-ink-600 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <span className={locale === "zh" ? "text-ink-900" : "text-ink-300"}>
              中
            </span>
            <span aria-hidden className="text-ink-300">
              /
            </span>
            <span className={locale === "en" ? "text-ink-900" : "text-ink-300"}>
              EN
            </span>
          </button>

          <button
            type="button"
            aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            title={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 xl:hidden"
          >
            <span className="sr-only">
              {menuOpen ? "关闭导航菜单" : "打开导航菜单"}
            </span>
            <span aria-hidden className="relative h-4 w-5">
              <span
                className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition-transform ${
                  menuOpen ? "translate-y-[7px] rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition-opacity ${
                  menuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition-transform ${
                  menuOpen ? "-translate-y-[7px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <nav
        id="mobile-navigation"
        className={`border-t border-slate-200/80 bg-white xl:hidden ${
          menuOpen ? "block" : "hidden"
        }`}
      >
        <div className="container-page grid gap-1 py-2">
          {navLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-100 text-ink-900"
                    : "text-ink-600 hover:bg-slate-100 hover:text-ink-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
