import type { ReactNode } from "react";

type PanelProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function Panel({ title, subtitle, actions, children }: PanelProps) {
  return (
    <section className="rounded-xl border border-[#2d2d30] bg-[#252526] p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-xs uppercase tracking-[0.24em] text-[#8c8c8c]">
            {title}
          </div>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-[#9ca3af]">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
