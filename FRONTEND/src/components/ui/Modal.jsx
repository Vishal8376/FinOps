import React, { useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

export default function Modal({ open, title, children, onClose, footer, className }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={clsx(
            "w-full max-w-xl rounded-2xl border border-slate-800/60 bg-slate-950 shadow-soft",
            className
          )}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-800/60 px-5 py-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-100">{title}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-800/70 bg-slate-900/40 text-slate-300 transition hover:bg-slate-900/70 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-4">{children}</div>
          {footer ? <div className="border-t border-slate-800/60 px-5 py-4">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

