import React from "react";
import clsx from "clsx";

export default function Badge({ tone = "neutral", children }) {
  const styles =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "danger"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
        : tone === "warning"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
          : "border-slate-700/70 bg-slate-900/40 text-slate-200";

  return (
    <span className={clsx("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", styles)}>
      {children}
    </span>
  );
}

