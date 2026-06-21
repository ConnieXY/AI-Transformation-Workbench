/** 闭环成效：从真实任务与工作流事件派生的可量化结果（诚实口径）。 */
export interface LoopOutcome {
  totalTasks: number;
  closedTasks: number;
  /** 已关闭 / 总任务，0..1 */
  closureRate: number;
  /** 工作流审计事件总数（全程可追溯） */
  totalSteps: number;
  /** AI 自动完成的环节数（actor=ai：根因/任务/复盘） */
  aiSteps: number;
  /** 人工把关的环节数（actor=human：上报/改派/验收） */
  humanSteps: number;
  /** 闭环覆盖的状态阶段（去重、按发生顺序） */
  stages: string[];
  /** 运营 SLA 目标小时数（行业目标，非实测） */
  targetHours: number;
}

interface TaskLike {
  status?: string | null;
}
interface EventLike {
  actor?: string | null;
  to_state?: string | null;
}

/**
 * 由任务与工作流事件计算闭环成效。纯函数、可单测。
 * 口径诚实：闭环率/审计事件/AI 占比均为真实派生；targetHours 是运营目标而非 A/B 实测。
 */
export function computeLoopOutcome(
  tasks: TaskLike[],
  events: EventLike[],
  targetHours = 72,
): LoopOutcome {
  const totalTasks = tasks.length;
  const closedTasks = tasks.filter((t) => t.status === "已关闭").length;
  const aiSteps = events.filter((e) => e.actor === "ai").length;
  const humanSteps = events.filter((e) => e.actor === "human").length;
  const stages = Array.from(
    new Set(
      events
        .map((e) => e.to_state)
        .filter((s): s is string => Boolean(s)),
    ),
  );
  return {
    totalTasks,
    closedTasks,
    closureRate: totalTasks > 0 ? closedTasks / totalTasks : 0,
    totalSteps: events.length,
    aiSteps,
    humanSteps,
    stages,
    targetHours,
  };
}
