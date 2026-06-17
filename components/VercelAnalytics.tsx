"use client";

import { Analytics } from "@vercel/analytics/next";

/** localStorage 标记：值为 "1" 时，本设备/浏览器的访问不计入统计 */
const OPT_OUT_KEY = "va-opt-out";

/**
 * Vercel Web Analytics + 自有流量过滤。
 *
 * 用法（每台设备 / 每个浏览器各做一次，含微信内置浏览器）：
 * - 打开 https://aiworkbench.wowonderwhy.com/?va=off  → 本设备不再计入统计
 * - 打开 https://aiworkbench.wowonderwhy.com/?va=on   → 恢复计入统计
 *
 * 标记存在 localStorage，按浏览器隔离；清缓存后需重新设置。
 */
export default function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (typeof window === "undefined") return event;
        try {
          const va = new URLSearchParams(window.location.search).get("va");
          if (va === "off") localStorage.setItem(OPT_OUT_KEY, "1");
          if (va === "on") localStorage.removeItem(OPT_OUT_KEY);
          // 已标记为自有设备 → 丢弃事件，不计入统计
          if (localStorage.getItem(OPT_OUT_KEY) === "1") return null;
        } catch {
          // localStorage 不可用时，照常上报
        }
        return event;
      }}
    />
  );
}
