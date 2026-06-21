import type { CompanyInfo, DimensionId } from "@/data/diagnosis";
import type { DiagnosisResult } from "@/lib/scoring";
import {
  type SolutionInput,
  emptySolutionInput,
  businessGoalOptions,
  painPointsByIndustry,
  solutionCompanySizeOptions,
} from "@/data/solution";

/** 报告页写入 localStorage 的诊断上下文（供方案模块继承）。 */
export interface DiagnosisContext {
  companyInfo: CompanyInfo;
  result: DiagnosisResult;
  submittedAt?: string;
}

/** 诊断行业 → 方案模块的行业枚举（两套选项不完全一致，做归一）。 */
function mapIndustry(raw: string): string {
  const s = raw || "";
  if (s.includes("制造")) return "制造业";
  if (s.includes("零售") || s.includes("消费")) return "零售";
  if (s.includes("物流") || s.includes("供应链")) return "物流";
  if (s.includes("教育")) return "教育";
  return "企业服务";
}

/** 最弱维度 → 方案模块的业务目标（只取在 businessGoalOptions 内的）。 */
const goalByDimension: Record<DimensionId, string> = {
  "org-collaboration": "管理透明",
  "process-efficiency": "增效",
  "data-management": "管理透明",
  knowledge: "知识沉淀",
  "business-operation": "增长",
  "ai-maturity": "增效",
};

/** 制造业痛点选项的关键词，用于从诊断主痛点里尽力命中预选项。 */
const painKeywords: Record<string, string[]> = {
  质量异常处理慢: ["质量", "异常", "不良", "返工"],
  生产日报手工汇总: ["日报", "手工", "汇总", "录入"],
  设备巡检不透明: ["设备", "巡检"],
  工艺知识难沉淀: ["工艺", "知识", "沉淀", "经验"],
  跨部门协同低效: ["跨部门", "协同", "协作", "不互通"],
  管理层数据不可视: ["管理层", "经营视图", "看板", "可视", "报表"],
};

/**
 * 把企业诊断结论映射为「行业解决方案」输入 —— 让诊断的智能（成熟度、短板、推荐场景）
 * 真正流入方案生成，而不仅是带过去行业/规模这点人口学信息。
 * 纯函数，便于单测；前端 mount 时调用做预填。
 */
export function solutionInputFromDiagnosis(
  ctx: DiagnosisContext,
): SolutionInput {
  const { companyInfo, result } = ctx;
  const industry = mapIndustry(companyInfo.industry);

  // 业务目标：由最弱维度推导（去重、限定在合法选项内）
  const businessGoals = Array.from(
    new Set(
      result.weakestDimensions
        .map((w) => goalByDimension[w.dimension.id])
        .filter((g): g is string => Boolean(g) && businessGoalOptions.includes(g)),
    ),
  );

  // 痛点：尽力从主痛点文本命中该行业的痛点选项（命不中则留空，由用户补选）
  const pain = companyInfo.mainPainPoint || "";
  const painPoints = (painPointsByIndustry[industry] ?? []).filter((opt) => {
    const kws = painKeywords[opt];
    return kws ? kws.some((k) => pain.includes(k)) : false;
  });

  // 把诊断结论凝练进补充说明 —— 这是真正喂给 LLM 的「诊断条件」
  const weakest = result.weakestDimensions
    .map((w) => `${w.dimension.title}（${w.average.toFixed(1)}/5）`)
    .join("、");
  const scenarios = Array.from(
    new Set(result.recommendations.flatMap((r) => r.scenarios)),
  ).join("、");
  const additionalContext = [
    `【继承自企业诊断｜${companyInfo.companyName || "未命名企业"}】`,
    `数智化成熟度：${result.maturity.label}（综合 ${result.overallScore.toFixed(1)}/5.0）。`,
    weakest ? `核心短板：${weakest}。` : "",
    scenarios ? `诊断推荐优先场景：${scenarios}。` : "",
    pain ? `原始痛点：${pain}。` : "",
    `请针对上述短板与推荐场景，生成可落地、可量化的解决方案。`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    ...emptySolutionInput,
    industry,
    companySize: solutionCompanySizeOptions.includes(companyInfo.companySize)
      ? companyInfo.companySize
      : "",
    businessGoals,
    painPoints,
    currentSystems: companyInfo.currentSystems || "",
    additionalContext,
  };
}
