import { Copy } from "lucide-react";
import type { RunResponse } from "../api";
import type { ComplexityEstimate } from "../utils/complexity";
import BenchmarkChart from "./BenchmarkChart";
import Panel from "./Panel";

type OutputPanelProps = {
  mode: "normal" | "dsa";
  runState: RunResponse;
  requestError: string | null;
  complexity: ComplexityEstimate;
  onCopyOutput: () => void;
};

export default function OutputPanel({
  mode,
  runState,
  requestError,
  complexity,
  onCopyOutput,
}: OutputPanelProps) {
  return (
    <Panel
      title={mode === "normal" ? "Output" : "DSA Insights"}
      actions={
        <button
          className="inline-flex items-center gap-2 rounded-md border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#cccccc] hover:bg-[#37373d]"
          onClick={onCopyOutput}
          type="button"
        >
          <Copy size={12} />
          Copy
        </button>
      }
    >
      {requestError ? (
        <div className="mb-3 rounded-xl border border-[#5a1d1d] bg-[#3a1515] p-3 text-sm text-[#fca5a5]">
          {requestError}
        </div>
      ) : null}

      {mode === "normal" ? (
        <div className="space-y-3">
          <OutputBlock
            label="stdout"
            value={runState.stdout}
            emptyMessage="No stdout yet."
          />
          <OutputBlock
            label="stderr"
            value={runState.stderr}
            emptyMessage="No stderr yet."
            tone="danger"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#2d4f6c] bg-[#1b2733] p-4 text-sm text-[#cbd5e1]">
              <div className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-[#8c8c8c]">
                Benchmark Summary
              </div>
              <div className="space-y-2">
                <MetricLine label="Status" value={runState.status} />
                <MetricLine
                  label="Compile Time"
                  value={formatMetric(runState.metrics?.compile_time_ms, "ms")}
                />
                <MetricLine
                  label="Runtime Mean"
                  value={formatMetric(runState.benchmark?.mean_wall_time_ms, "ms")}
                />
                <MetricLine
                  label="Runtime Min"
                  value={formatMetric(runState.benchmark?.min_wall_time_ms, "ms")}
                />
                <MetricLine
                  label="Runtime Max"
                  value={formatMetric(runState.benchmark?.max_wall_time_ms, "ms")}
                />
                <MetricLine
                  label="Mean Memory"
                  value={formatMetric(runState.benchmark?.mean_peak_memory_kb, "KB")}
                />
              </div>
            </div>

            <div className="rounded-xl border border-[#2d4f6c] bg-[#1b2733] p-4 text-sm text-[#cbd5e1]">
              <div className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-[#8c8c8c]">
                Estimated Complexity
              </div>
              <div className="space-y-2">
                <MetricLine label="Time" value={complexity.time} />
                <MetricLine label="Space" value={complexity.space} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {complexity.notes.map((note, index) => (
                  <span
                    key={index}
                    className="rounded-full border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-1 text-xs text-[#d4d4d4]"
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <BenchmarkChart runs={runState.benchmark?.runs ?? []} />

          <div className="rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] p-4">
            <div className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-[#8c8c8c]">
              Benchmark Samples
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {runState.benchmark?.runs?.length ? (
                runState.benchmark.runs.map((sample, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-[#2d2d30] bg-[#252526] px-3 py-2 text-sm text-[#d4d4d4]"
                  >
                    <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8c8c8c]">
                      Run {index + 1}
                    </div>
                    <div className="mt-2">
                      {formatMetric(sample.wall_time_ms, "ms")}
                    </div>
                    <div className="text-[#9ca3af]">
                      {formatMetric(sample.peak_memory_kb, "KB")}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-[#8c8c8c]">No benchmark samples yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

function OutputBlock({
  label,
  value,
  emptyMessage,
  tone = "normal",
}: {
  label: string;
  value: string;
  emptyMessage: string;
  tone?: "normal" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-[#5a1d1d] bg-[#241517]"
      : "border-[#3c3c3c] bg-[#1e1e1e]";

  return (
    <section className={`rounded-xl border p-3 ${toneClass}`}>
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#8c8c8c]">
        {label}
      </div>
      <pre className="min-h-28 whitespace-pre-wrap break-words font-mono text-sm leading-7 text-[#d4d4d4]">
        {value.trim() || emptyMessage}
      </pre>
    </section>
  );
}

function MetricLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <p>
      {label}: <span className="font-semibold text-white">{value}</span>
    </p>
  );
}

function formatMetric(value: number | null | undefined, unit: string): string {
  return value != null ? `${value} ${unit}` : "--";
}
