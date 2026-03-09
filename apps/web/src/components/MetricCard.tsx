type MetricCardProps = {
  label: string;
  value: string;
  tone: "blue" | "orange" | "green" | "violet";
};

export default function MetricCard({ label, value, tone }: MetricCardProps) {
  const toneClass =
    tone === "blue"
      ? "border-[#2d4f6c] bg-[#1b2733]"
      : tone === "orange"
        ? "border-[#5a3b20] bg-[#2e2117]"
        : tone === "green"
          ? "border-[#234b3b] bg-[#162a22]"
          : "border-[#47305c] bg-[#261b33]";

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8c8c8c]">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-[#d4d4d4]">{value}</div>
    </div>
  );
}
