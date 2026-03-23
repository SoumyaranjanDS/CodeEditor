import { TerminalSquare, Trash2 } from "lucide-react";
import type { RunHistoryItem } from "../types/app";
import HistoryBadge from "./HistoryBadge";
import Panel from "./Panel";

type RecentRunsPanelProps = {
  runHistory: RunHistoryItem[];
  onClear: () => void;
  onDelete: (id: string) => void;
  onRestore: (item: RunHistoryItem) => void;
};

export default function RecentRunsPanel({
  runHistory,
  onClear,
  onDelete,
  onRestore,
}: RecentRunsPanelProps) {
  return (
    <Panel
      title="Recent Runs"
      actions={
        <button
          className="inline-flex items-center gap-2 rounded-md border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#cccccc] hover:bg-[#37373d] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onClear}
          type="button"
          disabled={runHistory.length === 0}
        >
          <Trash2 size={12} />
          Clear All
        </button>
      }
    >
      <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.24em] text-[#8c8c8c]">
        <TerminalSquare size={14} />
        Run Snapshots
      </div>

      {runHistory.length === 0 ? (
        <div className="rounded-xl border border-[#2d2d30] bg-[#1e1e1e] p-4 text-sm text-[#8c8c8c]">
          No runs saved yet.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {runHistory.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-[#2d2d30] bg-[#1e1e1e] p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#8c8c8c]">
                    {item.language} / {item.mode}
                  </div>
                  <div className="mt-1 font-mono text-xs text-[#6b7280]">
                    {item.createdAt}
                  </div>
                </div>

                <button
                  className="rounded-md border border-[#5a1d1d] bg-[#3a1515] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#f87171] hover:bg-[#4a1b1b]"
                  onClick={() => onDelete(item.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <HistoryBadge label={`status: ${item.status}`} />
                <HistoryBadge label={`exit: ${item.exitCode ?? "--"}`} />
                <HistoryBadge label={`compile: ${item.compileTimeMs ?? "--"} ms`} />
                <HistoryBadge label={`run: ${item.runtimeMs ?? "--"} ms`} />
              </div>

              <div className="mt-3 text-sm text-[#9ca3af]">
                <p>
                  <span className="font-semibold text-[#d4d4d4]">stdout:</span>{" "}
                  {item.stdoutPreview}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-[#d4d4d4]">stderr:</span>{" "}
                  {item.stderrPreview}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#4fc1ff]">
                  Snapshot
                </div>

                <button
                  className="rounded-md border border-[#094771] bg-[#0e639c] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white hover:bg-[#1177bb]"
                  onClick={() => onRestore(item)}
                  type="button"
                >
                  Restore
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}
