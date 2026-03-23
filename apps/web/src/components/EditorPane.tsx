import Editor from "@monaco-editor/react";
import { Play, RotateCcw } from "lucide-react";
import type { Language, Mode, RunStatus } from "../api";
import { fileExtension } from "../utils/complexity";
import { labels, monacoLanguages } from "../utils/history";
import ModeButton from "./ModeButton";

type EditorPaneProps = {
  language: Language;
  mode: Mode;
  code: string;
  isRunning: boolean;
  status: RunStatus;
  onLanguageChange: (language: Language) => void;
  onModeChange: (mode: Mode) => void;
  onCodeChange: (value: string) => void;
  onReset: () => void;
  onRun: () => void;
};

export default function EditorPane({
  language,
  mode,
  code,
  isRunning,
  status,
  onLanguageChange,
  onModeChange,
  onCodeChange,
  onReset,
  onRun,
}: EditorPaneProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#2d2d30] bg-[#252526] shadow-sm">
      <div className="border-b border-[#2d2d30] bg-[#2d2d30] px-3 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(labels) as Language[]).map((item) => (
              <button
                key={item}
                className={`rounded-md px-3 py-2 font-mono text-sm transition ${
                  item === language
                    ? "bg-[#094771] text-white"
                    : "bg-[#1e1e1e] text-[#cccccc] hover:bg-[#37373d]"
                }`}
                onClick={() => onLanguageChange(item)}
                type="button"
              >
                {labels[item]}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex rounded-lg border border-[#3c3c3c] bg-[#1e1e1e] p-1">
              <ModeButton active={mode === "normal"} onClick={() => onModeChange("normal")}>
                Normal
              </ModeButton>
              <ModeButton active={mode === "dsa"} onClick={() => onModeChange("dsa")}>
                DSA
              </ModeButton>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <button
                className="inline-flex items-center gap-2 rounded-md border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm font-medium text-[#cccccc] hover:bg-[#37373d]"
                onClick={onReset}
                type="button"
              >
                <RotateCcw size={14} />
                Reset
              </button>

              <button
                className="inline-flex items-center gap-2 rounded-md bg-[#0e639c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1177bb] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onRun}
                type="button"
                disabled={isRunning}
              >
                <Play size={14} />
                {isRunning ? "Running..." : "Run"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#3c3c3c] bg-[#1e1e1e] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-[#b3b3b3]">
            main.{fileExtension(language)}
          </span>
          <span className="rounded-full border border-[#3c3c3c] bg-[#1e1e1e] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-[#b3b3b3]">
            {mode}
          </span>
          <span className="rounded-full border border-[#234b3b] bg-[#162a22] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-[#9de0b9]">
            {status}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-[#2d2d30] bg-[#2d2d30] px-4 py-2">
        <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
        <span className="ml-3 font-mono text-xs uppercase tracking-[0.24em] text-[#8c8c8c]">
          editor
        </span>
      </div>

      <div className="h-[52vh] min-h-[360px] sm:h-105 md:h-125 xl:h-140">
        <Editor
          height="100%"
          language={monacoLanguages[language]}
          value={code}
          onChange={(value) => onCodeChange(value ?? "")}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontFamily: "JetBrains Mono, Consolas, monospace",
            fontSize: 14,
            lineHeight: 24,
            padding: { top: 16, bottom: 16 },
            smoothScrolling: true,
            roundedSelection: true,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 4
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-[#2d2d30] bg-[#2d2d30] p-3 sm:hidden">
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm font-medium text-[#cccccc]"
          onClick={onReset}
          type="button"
        >
          <RotateCcw size={14} />
          Reset
        </button>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0e639c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1177bb] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onRun}
          type="button"
          disabled={isRunning}
        >
          <Play size={14} />
          {isRunning ? "Running..." : "Run"}
        </button>
      </div>
    </section>
  );
}
