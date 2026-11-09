import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { translateText, translateValue } from "@/lib/i18n";
import { sampleDiagnosisSubmissionEn } from "@/data/diagnosis";
import { sampleSolutionInputEn } from "@/data/solution";
import { sampleIncidentEn } from "@/data/manufacturing";

describe("UI localization", () => {
  it("translates exact UI copy and preserves surrounding whitespace", () => {
    assert.equal(translateText("  首页  ", "en"), "  Home  ");
    assert.equal(translateText("首页", "zh"), "首页");
  });

  it("interpolates translated dynamic templates", () => {
    assert.equal(
      translateText("还有 3 题未作答，请完成全部问卷后再生成报告。", "en"),
      "3 questions remain unanswered. Please complete the entire questionnaire before generating the report.",
    );
  });

  it("recursively translates structured trace values without changing keys", () => {
    assert.deepEqual(
      translateValue({ label: "首页", nested: ["企业诊断"] }, "en"),
      { label: "Home", nested: ["Enterprise Diagnosis"] },
    );
  });

  it("leaves unknown and user-provided text untouched", () => {
    assert.equal(translateText("用户自定义内容", "en"), "用户自定义内容");
  });

  it("uses English free-text values for every fill-example flow", () => {
    const visibleEnglishSampleValues = [
      sampleDiagnosisSubmissionEn.companyInfo.companyName,
      sampleDiagnosisSubmissionEn.companyInfo.currentSystems,
      sampleDiagnosisSubmissionEn.companyInfo.mainPainPoint,
      sampleSolutionInputEn.currentSystems,
      sampleSolutionInputEn.additionalContext,
      sampleIncidentEn.productName,
      sampleIncidentEn.productionLine,
      sampleIncidentEn.process,
      sampleIncidentEn.incidentDescription,
      sampleIncidentEn.reporter,
    ];

    for (const value of visibleEnglishSampleValues) {
      assert.equal(/[\u3400-\u9fff]/.test(value), false, value);
    }
  });
});
