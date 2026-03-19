import React from "react";
import clsx from "clsx";

export default function Card({ title, subtitle, right, children, className }) {
  return (
    <section className={clsx("rounded-2xl border border-slate-800/60 bg-slate-900/30 p-5 shadow-card", className)}>
      {(title || right) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h3 className="truncate text-sm font-semibold text-slate-100">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-xs leading-relaxed text-slate-400">{subtitle}</p> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

