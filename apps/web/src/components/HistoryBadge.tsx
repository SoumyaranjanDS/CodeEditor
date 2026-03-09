type HistoryBadgeProps = {
  label: string;
};

export default function HistoryBadge({ label }: HistoryBadgeProps) {
  return (
    <span className="rounded-full border border-[#3c3c3c] bg-[#252526] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-[#b3b3b3]">
      {label}
    </span>
  );
}
