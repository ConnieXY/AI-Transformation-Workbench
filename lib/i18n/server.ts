import "server-only";
import type { Locale } from "./index";

/** Resolve the requested UI language without trusting arbitrary header values. */
export function getRequestLocale(request: Request): Locale {
  return request.headers.get("x-ui-language")?.toLowerCase() === "en"
    ? "en"
    : "zh";
}
