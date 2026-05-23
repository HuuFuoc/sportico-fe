import type { ReactNode } from "react";

export function Divider({ children }: { children?: ReactNode }) {
  return (
    <div
      role="separator"
      className="my-5 flex items-center gap-3 text-[10.5px] uppercase tracking-[0.16em] text-slate-400"
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
      {children && <span>{children}</span>}
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
    </div>
  );
}
