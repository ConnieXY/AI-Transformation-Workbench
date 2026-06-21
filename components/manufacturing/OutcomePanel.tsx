import type { LoopOutcome } from "@/lib/manufacturing/outcome";

/**
 * 闭环成效面板：把「异常处理」从临场协调变成指标可量化的标准动作。
 * 口径诚实——闭环率/AI 占比/审计事件均为真实派生；SLA 为运营目标而非 A/B 实测。
 */
export default function OutcomePanel({ outcome }: { outcome: LoopOutcome }) {
  const pct = Math.round(outcome.closureRate * 100);
  const cards = [
    {
      value: `${outcome.closedTasks}/${outcome.totalTasks}`,
      label: "整改任务闭环",
      hint: `已关闭 ${pct}% · human-in-the-loop 推进`,
    },
    {
      value: `${outcome.aiSteps}/${outcome.totalSteps}`,
      label: "AI 自动完成环节",
      hint: `根因·任务·复盘由 AI 生成，人工把关 ${outcome.humanSteps} 个关卡`,
    },
    {
      value: `${outcome.totalSteps}`,
      label: "全程审计事件",
      hint: `覆盖 ${outcome.stages.length} 个状态阶段，步步可追溯`,
    },
    {
      value: `≤ ${outcome.targetHours}h`,
      label: "闭环 SLA 目标",
      hint: "运营目标值（行业经验，非实测 A/B）",
    },
  ];
  return (
    <section className="rounded-2xl border border-brand-200 bg-brand-50/40 p-6 shadow-card sm:p-8">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">
          ✦
        </span>
        <h2 className="text-lg font-bold tracking-tight text-ink-900">
          闭环成效
        </h2>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="text-2xl font-bold tracking-tight text-ink-900">
              {c.value}
            </p>
            <p className="mt-1 text-sm font-semibold text-ink-700">{c.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">{c.hint}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-500">
        以往依赖临场协调的质量异常处理，已固化为「上报 → AI 根因 → 任务 → 人工把关 → 复盘」的结构化闭环：
        AI 加速、人工控制、全程可追溯、结果可量化。
      </p>
    </section>
  );
}
