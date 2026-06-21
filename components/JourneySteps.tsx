import Link from "next/link";

interface Step {
  label: string;
  caption: string;
  href: string;
}

const STEPS: Step[] = [
  { label: "诊断", caption: "评估现状", href: "/diagnosis" },
  { label: "方案", caption: "生成对策", href: "/solution-builder" },
  { label: "闭环", caption: "运营落地 · 成效", href: "/manufacturing-demo" },
];

/**
 * 转型旅程导航：诊断 → 方案 → 运营闭环。
 * 把三个原本割裂的模块显性串成一条客户旅程（current 高亮，已完成可回看，后续可前往）。
 */
export default function JourneySteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <nav aria-label="转型旅程" className="border-b border-slate-200 bg-slate-50/60">
      <ol className="container-page flex items-center gap-1 py-3 text-sm sm:gap-2">
        {STEPS.map((step, i) => {
          const state =
            i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li key={step.label} className="flex items-center gap-1 sm:gap-2">
              <Link
                href={step.href}
                aria-current={state === "current" ? "step" : undefined}
                className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors ${
                  state === "current"
                    ? "bg-white shadow-card"
                    : "hover:bg-white/70"
                }`}
              >
                <span
                  className={`grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-bold ${
                    state === "done"
                      ? "bg-brand-100 text-brand-700"
                      : state === "current"
                        ? "bg-brand-600 text-white"
                        : "bg-slate-200 text-ink-400"
                  }`}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                <span className="flex flex-col leading-tight">
                  <span
                    className={`font-semibold ${
                      state === "todo" ? "text-ink-400" : "text-ink-900"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="hidden text-xs text-ink-400 sm:block">
                    {step.caption}
                  </span>
                </span>
              </Link>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={`h-px w-4 sm:w-8 ${
                    i < current ? "bg-brand-300" : "bg-slate-300"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
