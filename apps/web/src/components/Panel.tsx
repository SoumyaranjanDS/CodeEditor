import type { ReactNode } from "react";

type PanelProps = {
  title: string;
  children: ReactNode;
};

export default function Panel({ title, children }: PanelProps) {
  return (
    <section className="rounded-xl border border-[#2d2d30] bg-[#252526] p-4 shadow-sm">
      <div className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-[#8c8c8c]">
        {title}
      </div>
      {children}
    </section>
  );
}
