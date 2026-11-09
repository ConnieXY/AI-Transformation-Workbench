/**
 * One-off/maintenance utility for the bilingual UI dictionary.
 *
 * It extracts Chinese string literals and JSX text from the public application
 * source, asks the configured OpenAI-compatible model for professional English
 * translations, and writes a deterministic JSON map consumed by the UI.
 *
 * Run with:
 *   node --env-file=.env.local --import tsx scripts/generate-ui-translations.ts
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import OpenAI from "openai";
import ts from "typescript";

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, "lib/i18n/generated-translations.json");
const CACHE = path.join(ROOT, ".translation-cache.json");
const CJK = /[\u3400-\u9fff]/;
const TRANSLATION_OVERRIDES: Record<string, string> = {
  "企业数智化转型工作台": "Enterprise AI Transformation Workbench",
};

type SourceEntry = { text: string; files: string[] };

function sourceFiles(): string[] {
  const output = execFileSync(
    "rg",
    ["--files", "app", "components", "data", "lib"],
    { cwd: ROOT, encoding: "utf8" },
  );
  return output
    .trim()
    .split("\n")
    .filter((file) => /\.(ts|tsx|json)$/.test(file));
}

function collectStrings(): SourceEntry[] {
  const collected = new Map<string, Set<string>>();
  const add = (text: string, file: string) => {
    const normalized = text.replace(/\r\n/g, "\n").trim();
    if (!normalized || !CJK.test(normalized)) return;
    const files = collected.get(normalized) ?? new Set<string>();
    files.add(file);
    collected.set(normalized, files);
  };

  const walkJson = (value: unknown, file: string) => {
    if (typeof value === "string") add(value, file);
    else if (Array.isArray(value)) value.forEach((item) => walkJson(item, file));
    else if (value && typeof value === "object")
      Object.values(value).forEach((item) => walkJson(item, file));
  };

  for (const file of sourceFiles()) {
    const absolute = path.join(ROOT, file);
    if (file.endsWith(".json")) {
      walkJson(JSON.parse(fs.readFileSync(absolute, "utf8")), file);
      continue;
    }

    const contents = fs.readFileSync(absolute, "utf8");
    const source = ts.createSourceFile(
      file,
      contents,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (node: ts.Node) => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        add(node.text, file);
      } else if (ts.isJsxText(node)) {
        add(node.getText(source).replace(/\s+/g, " "), file);
      } else if (ts.isTemplateExpression(node)) {
        let template = node.head.text;
        node.templateSpans.forEach((span, index) => {
          template += `{{${index}}}${span.literal.text}`;
        });
        add(template, file);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  return Array.from(collected.entries()).map(([text, files]) => ({
    text,
    files: Array.from(files).sort(),
  }));
}

function readCache(): Record<string, string> {
  if (!fs.existsSync(CACHE)) return {};
  return JSON.parse(fs.readFileSync(CACHE, "utf8")) as Record<string, string>;
}

function saveCache(cache: Record<string, string>) {
  fs.writeFileSync(CACHE, `${JSON.stringify(cache, null, 2)}\n`);
}

function parseJsonObject(raw: string): Record<string, string> {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as Record<string, string>;
}

/** Keep the most visible domain terms consistent across independently translated batches. */
function normalizeTranslation(value: string): string {
  return value
    .replace(/Digital and Intelligent Transformation/g, "Digital Transformation")
    .replace(/digital and intelligent transformation/g, "digital transformation")
    .replace(/digital intelligence/gi, (match) =>
      match[0] === "D" ? "Digital transformation" : "digital transformation",
    )
    .replace(/Quality Exceptions/g, "Quality Incidents")
    .replace(/Quality Exception/g, "Quality Incident")
    .replace(/quality exceptions/gi, (match) =>
      match[0] === "Q" ? "Quality incidents" : "quality incidents",
    )
    .replace(/quality exception/gi, (match) =>
      match[0] === "Q" ? "Quality incident" : "quality incident",
    );
}

async function translateBatch(
  client: OpenAI,
  model: string,
  batch: Array<SourceEntry & { id: string }>,
): Promise<Record<string, string>> {
  const response = await client.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a senior B2B product localization editor. Translate every supplied Simplified Chinese UI string into concise, accurate, professional English for an enterprise AI transformation workbench. Preserve placeholders such as {{0}}, numbers, punctuation needed for readability, product names, acronyms, JSON/code fragments, and line breaks. Translate meaning, not word order. Return one JSON object mapping each id to only its English translation. Do not omit ids and do not add commentary.",
      },
      {
        role: "user",
        content: JSON.stringify(
          batch.map(({ id, text, files }) => ({ id, text, context: files })),
        ),
      },
    ],
  });
  return parseJsonObject(response.choices[0]?.message?.content ?? "{}");
}

async function main() {
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) throw new Error("LLM_API_KEY is required");
  const model = process.env.LLM_MODEL?.trim() || "gpt-4o-mini";
  const client = new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1",
  });
  const entries = collectStrings();
  const cache = readCache();
  const missing = entries.filter(({ text }) => !cache[text]);
  const batchSize = 60;

  console.log(`Collected ${entries.length} strings; ${missing.length} require translation.`);
  for (let start = 0; start < missing.length; start += batchSize) {
    const slice = missing.slice(start, start + batchSize);
    const batch = slice.map((entry, index) => ({
      ...entry,
      id: `s${start + index + 1}`,
    }));
    const translated = await translateBatch(client, model, batch);
    for (const item of batch) {
      const english = translated[item.id]?.trim();
      if (!english) throw new Error(`Missing translation for ${item.id}: ${item.text}`);
      cache[item.text] = english;
    }
    saveCache(cache);
    console.log(`Translated ${Math.min(start + batch.length, missing.length)}/${missing.length}`);
  }

  const dictionary = Object.fromEntries(
    entries
      .map(({ text }) => [text, normalizeTranslation(cache[text])] as const)
      .map(([text, english]) => [
        text,
        TRANSLATION_OVERRIDES[text] ?? english,
      ] as const)
      .sort(([a], [b]) => a.localeCompare(b, "zh-CN")),
  );
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(dictionary, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(dictionary).length} translations to ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
