"use client";

import type { Question } from "@/data/diagnosis";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import ScoreSelector from "./ScoreSelector";

interface QuestionItemProps {
  /** 该维度内的题号，例如 1、2、3、4 */
  number: number;
  question: Question;
  value: number | null;
  onChange: (value: number) => void;
}

/** 单个问题：题号 + 题干 + 评分提示 + 1-5 分选择器。 */
export default function QuestionItem({
  number,
  question,
  value,
  onChange,
}: QuestionItemProps) {
  const { t } = useLanguage();
  const localizedQuestion = t(question.question);

  return (
    <div className="border-t border-slate-100 py-5 first:border-t-0 first:pt-0">
      <div className="flex gap-3">
        <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-md bg-slate-100 text-xs font-semibold text-ink-500">
          {number}
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-ink-900">
            {localizedQuestion}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">
            {t(question.description)}
          </p>
        </div>
      </div>

      <div className="mt-4 sm:pl-9">
        <ScoreSelector
          value={value}
          onChange={onChange}
          label={localizedQuestion}
        />
      </div>
    </div>
  );
}
