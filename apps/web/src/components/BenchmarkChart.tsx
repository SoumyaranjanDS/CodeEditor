import { useState } from "react";
import type { RunMetrics } from "../api";

type BenchmarkChartProps = {
  runs: RunMetrics[];
};

export default function BenchmarkChart({ runs }: BenchmarkChartProps) {
  const [activeMobileTab, setActiveMobileTab] = useState<"runtime" | "memory">("runtime");

  if (!runs.length) {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <PlotCard title="Runtime Plot" empty />
        <PlotCard title="Memory Plot" empty />
      </div>
    );
  }

  const runtimeValues = runs.map((run) => run.wall_time_ms ?? 0);
  const memoryValues = runs.map((run) => run.peak_memory_kb ?? 0);

  return (
    <>
      <div className="xl:hidden">
        <div className="mb-3 flex rounded-lg border border-[#3c3c3c] bg-[#1e1e1e] p-1">
          <button
            className={`flex-1 rounded-md px-3 py-2 font-mono text-xs uppercase tracking-[0.16em] transition ${
              activeMobileTab === "runtime"
                ? "bg-[#0e639c] text-white"
                : "text-[#cccccc]"
            }`}
            onClick={() => setActiveMobileTab("runtime")}
            type="button"
          >
            Runtime
          </button>
          <button
            className={`flex-1 rounded-md px-3 py-2 font-mono text-xs uppercase tracking-[0.16em] transition ${
              activeMobileTab === "memory"
                ? "bg-[#0e639c] text-white"
                : "text-[#cccccc]"
            }`}
            onClick={() => setActiveMobileTab("memory")}
            type="button"
          >
            Memory
          </button>
        </div>

        {activeMobileTab === "runtime" ? (
          <PlotCard
            title="Runtime Plot"
            unit="ms"
            values={runtimeValues}
            color="#4fc1ff"
            fill="rgba(79, 193, 255, 0.16)"
          />
        ) : (
          <PlotCard
            title="Memory Plot"
            unit="KB"
            values={memoryValues}
            color="#34d399"
            fill="rgba(52, 211, 153, 0.16)"
          />
        )}
      </div>

      <div className="hidden xl:grid xl:grid-cols-2 xl:gap-4">
        <PlotCard
          title="Runtime Plot"
          unit="ms"
          values={runtimeValues}
          color="#4fc1ff"
          fill="rgba(79, 193, 255, 0.16)"
        />
        <PlotCard
          title="Memory Plot"
          unit="KB"
          values={memoryValues}
          color="#34d399"
          fill="rgba(52, 211, 153, 0.16)"
        />
      </div>
    </>
  );
}

function PlotCard({
  title,
  values = [],
  unit = "",
  color = "#4fc1ff",
  fill = "rgba(79, 193, 255, 0.16)",
  empty = false
}: {
  title: string;
  values?: number[];
  unit?: string;
  color?: string;
  fill?: string;
  empty?: boolean;
}) {
  if (empty || values.length === 0) {
    return (
      <div className="rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] p-4">
        <div className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-[#8c8c8c]">
          {title}
        </div>
        <div className="text-sm text-[#8c8c8c]">No benchmark data yet.</div>
      </div>
    );
  }

  const width = 520;
  const height = 180;
  const padding = 24;
  const maxY = Math.max(...values, 1);
  const minY = Math.min(...values, 0);
  const rangeY = Math.max(maxY - minY, 1);

  const toX = (index: number) =>
    values.length === 1
      ? width / 2
      : padding + (index * (width - padding * 2)) / (values.length - 1);

  const toY = (value: number) =>
    height - padding - ((value - minY) * (height - padding * 2)) / rangeY;

  const linePoints = values.map((value, index) => `${toX(index)},${toY(value)}`).join(" ");
  const areaPoints = `${padding},${height - padding} ${linePoints} ${toX(values.length - 1)},${height - padding}`;
  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => {
    const value = minY + (rangeY * (yTicks - i)) / yTicks;
    return Math.round(value * 100) / 100;
  });

  return (
    <div className="rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] p-4">
      <div className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-[#8c8c8c]">
        {title}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-40 min-w-[320px] w-full sm:h-45 sm:min-w-130"
          role="img"
          aria-label={title}
        >
          <rect x="0" y="0" width={width} height={height} fill="#1e1e1e" rx="12" />

          {tickValues.map((tick, index) => {
            const y = padding + (index * (height - padding * 2)) / yTicks;
            return (
              <g key={index}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#2d2d30" strokeWidth="1" />
                <text
                  x={6}
                  y={y + 4}
                  fill="#8c8c8c"
                  fontSize="9"
                  fontFamily="JetBrains Mono, Consolas, monospace"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {values.map((_, index) => {
            const x = toX(index);
            return (
              <g key={index}>
                <line x1={x} y1={padding} x2={x} y2={height - padding} stroke="#252526" strokeWidth="1" />
                <text
                  x={x}
                  y={height - 6}
                  textAnchor="middle"
                  fill="#8c8c8c"
                  fontSize="9"
                  fontFamily="JetBrains Mono, Consolas, monospace"
                >
                  {index + 1}
                </text>
              </g>
            );
          })}

          <polygon points={areaPoints} fill={fill} />
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={linePoints}
          />

          {values.map((value, index) => {
            const cx = toX(index);
            const cy = toY(value);

            return (
              <g key={index}>
                <circle cx={cx} cy={cy} r="3.5" fill="#1e1e1e" stroke={color} strokeWidth="2" />
                <title>{`Run ${index + 1}: ${value} ${unit}`}</title>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
