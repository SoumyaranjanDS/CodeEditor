import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Language, Mode, RunResponse } from "./api";
import { runCode } from "./api";
import EditorPane from "./components/EditorPane";
import FeatureCard from "./components/FeatureCard";
import Header from "./components/Header";
import MetricCard from "./components/MetricCard";
import OutputPanel from "./components/OutputPanel";
import Panel from "./components/Panel";
import RecentRunsPanel from "./components/RecentRunsPanel";
import { useLocalStorage } from "./hooks/useLocalStorage";
import type { RunHistoryItem } from "./types/app";
import { clampBenchmarkRuns, estimateComplexity } from "./utils/complexity";
import {
  initialRunState,
  normalizeHistoryItem,
  starterCode,
} from "./utils/history";
import { STORAGE_KEYS } from "./utils/storage";

function getInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return "python";
  }

  const value = localStorage.getItem(STORAGE_KEYS.language);
  return value === "python" || value === "cpp" || value === "java" || value === "c"
    ? value
    : "python";
}

function getInitialMode(): Mode {
  if (typeof window === "undefined") {
    return "normal";
  }

  const value = localStorage.getItem(STORAGE_KEYS.mode);
  return value === "normal" || value === "dsa" ? value : "normal";
}

function getInitialSnippets() {
  if (typeof window === "undefined") {
    return starterCode;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.snippets);
    if (!raw) return starterCode;
    return { ...starterCode, ...JSON.parse(raw) };
  } catch {
    return starterCode;
  }
}

function getInitialHistory(): RunHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeHistoryItem) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());
  const [mode, setMode] = useState<Mode>(() => getInitialMode());
  const [snippets, setSnippets] = useLocalStorage<Record<Language, string>>(
    STORAGE_KEYS.snippets,
    getInitialSnippets()
  );
  const [stdin, setStdin] = useLocalStorage<string>(STORAGE_KEYS.stdin, "aura\n");
  const [runHistory, setRunHistory] = useLocalStorage<RunHistoryItem[]>(
    STORAGE_KEYS.history,
    getInitialHistory()
  );
  const [code, setCode] = useState<string>(snippets[language]);
  const [runState, setRunState] = useState<RunResponse>(initialRunState);
  const [isRunning, setIsRunning] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [benchmarkRuns, setBenchmarkRuns] = useState<number>(3);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.language, language);
    }
  }, [language]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.mode, mode);
    }
  }, [mode]);

  useEffect(() => {
    setCode(snippets[language]);
  }, [language, snippets]);

  const deferredCode = useDeferredValue(code);
  const complexity = useMemo(
    () => estimateComplexity(deferredCode, language),
    [deferredCode, language]
  );

  const outputText = useMemo(() => {
    const parts = [runState.stdout?.trim(), runState.stderr?.trim()].filter(Boolean);
    return parts.length ? parts.join("\n\n") : "No output yet.";
  }, [runState]);

  function handleLanguageChange(next: Language) {
    setLanguage(next);
    setRunState({
      ...initialRunState,
      language: next,
      stderr: initialRunState.stderr,
    });
    setRequestError(null);
  }

  function handleCodeChange(value: string) {
    setCode(value);
    setSnippets((current) => ({
      ...current,
      [language]: value,
    }));
  }

  function handleResetCurrentLanguage() {
    const resetValue = starterCode[language];
    setCode(resetValue);
    setSnippets((current) => ({
      ...current,
      [language]: resetValue,
    }));
  }

  function restoreRun(item: RunHistoryItem) {
    setLanguage(item.language);
    setMode(item.mode);
    setCode(item.codeSnapshot);
    setStdin(item.stdinSnapshot);
    setRunState(item.resultSnapshot);
    setRequestError(null);
    setSnippets((current) => ({
      ...current,
      [item.language]: item.codeSnapshot,
    }));
  }

  function deleteRunHistoryItem(id: string) {
    setRunHistory((current) => current.filter((item) => item.id !== id));
  }

  function clearRunHistory() {
    setRunHistory([]);
  }

  function pushRunHistory(result: RunResponse) {
    if (result.status !== "completed") {
      return;
    }

    const item: RunHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toLocaleString(),
      language,
      mode,
      status: result.status,
      exitCode: result.exit_code,
      runtimeMs: result.metrics?.wall_time_ms ?? null,
      compileTimeMs: result.metrics?.compile_time_ms ?? null,
      memoryKb: result.metrics?.peak_memory_kb ?? null,
      stdoutPreview: preview(result.stdout),
      stderrPreview: preview(result.stderr),
      codeSnapshot: code,
      stdinSnapshot: stdin,
      resultSnapshot: result,
    };

    setRunHistory((current) => [item, ...current].slice(0, 12));
  }

  async function handleRun() {
    setIsRunning(true);
    setRequestError(null);
    setRunState((current) => ({
      ...current,
      status: "running",
      language,
    }));

    try {
      const result = await runCode({
        language,
        code,
        stdin,
        mode,
        benchmark_runs: clampBenchmarkRuns(benchmarkRuns),
      });

      setRunState(result);
      pushRunHistory(result);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unknown request error");
      setRunState({
        ...initialRunState,
        status: "error",
        language,
        stderr:
          "Could not reach the API. Make sure the FastAPI server is running on port 8000.",
      });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleCopyOutput() {
    if (!outputText || outputText === "No output yet.") {
      return;
    }

    try {
      await navigator.clipboard.writeText(outputText);
    } catch {
      setRequestError("Clipboard access was blocked in this browser.");
    }
  }

  const runtime =
    runState.metrics?.wall_time_ms != null ? `${runState.metrics.wall_time_ms} ms` : "--";
  const compileTime =
    runState.metrics?.compile_time_ms != null
      ? `${runState.metrics.compile_time_ms} ms`
      : "--";
  const memory =
    runState.metrics?.peak_memory_kb != null
      ? `${runState.metrics.peak_memory_kb} KB`
      : "--";
  const exitCode = runState.exit_code != null ? String(runState.exit_code) : "--";

  return (
    <main className="min-h-screen bg-[#1e1e1e] text-[#d4d4d4]">
      <div className="mx-auto flex min-h-screen max-w-[1560px] flex-col">
        <Header
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          setDetailsOpen={setDetailsOpen}
        />

        <div className="flex-1 p-2 sm:p-3 lg:p-4">
          <div className="grid gap-3 lg:gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.82fr)] xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.75fr)]">
            <section className="order-1 flex min-w-0 flex-col gap-4">
              <EditorPane
                language={language}
                mode={mode}
                code={code}
                isRunning={isRunning}
                status={runState.status}
                onLanguageChange={handleLanguageChange}
                onModeChange={setMode}
                onCodeChange={handleCodeChange}
                onReset={handleResetCurrentLanguage}
                onRun={() => void handleRun()}
              />

              <RecentRunsPanel
                runHistory={runHistory}
                onClear={clearRunHistory}
                onDelete={deleteRunHistoryItem}
                onRestore={restoreRun}
              />
            </section>

            <aside className="order-2 flex min-w-0 flex-col gap-3 lg:gap-4">
              <Panel title="Execution" subtitle="Runtime telemetry from the latest run.">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Status" value={runState.status} tone="blue" />
                  <MetricCard label="Exit" value={exitCode} tone="orange" />
                  <MetricCard label="Compile" value={compileTime} tone="violet" />
                  <MetricCard label="Runtime" value={runtime} tone="green" />
                  <MetricCard label="Memory" value={memory} tone="orange" />
                </div>
              </Panel>

              <Panel
                title="Standard Input"
                subtitle="This input is sent directly to the runner for the next execution."
              >
                <textarea
                  className="h-28 w-full resize-none rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] p-4 font-mono text-sm text-[#d4d4d4] outline-none placeholder:text-[#6b7280]"
                  placeholder="stdin goes here..."
                  value={stdin}
                  onChange={(event) => setStdin(event.target.value)}
                />
              </Panel>

              <Panel
                title="DSA Controls"
                subtitle="Benchmark mode repeats the same run and aggregates telemetry."
              >
                <div className="space-y-3">
                  <label className="block text-sm text-[#cccccc]">Benchmark Runs</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    inputMode="numeric"
                    value={benchmarkRuns}
                    onChange={(event) =>
                      setBenchmarkRuns(clampBenchmarkRuns(Number(event.target.value)))
                    }
                    className="w-full rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#d4d4d4] outline-none"
                  />
                </div>
              </Panel>

              <OutputPanel
                mode={mode}
                runState={runState}
                requestError={requestError}
                complexity={complexity}
                onCopyOutput={() => void handleCopyOutput()}
              />
            </aside>
          </div>
        </div>
      </div>

      {detailsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#2d2d30] bg-[#252526] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#2d2d30] px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white sm:text-lg">
                  AuraCode Features
                </h2>
                <p className="mt-1 text-sm text-[#9ca3af]">
                  Current editor capabilities and build direction.
                </p>
              </div>
              <button
                className="shrink-0 rounded-lg border border-[#3c3c3c] bg-[#1e1e1e] p-2 text-[#cccccc] hover:bg-[#37373d]"
                onClick={() => setDetailsOpen(false)}
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FeatureCard
                  title="Polyglot Runner"
                  text="Python, C, C++, and Java execution with structured responses."
                />
                <FeatureCard
                  title="Monaco Editor"
                  text="VS Code-like editing with syntax highlighting and minimap."
                />
                <FeatureCard
                  title="Execution Telemetry"
                  text="Separate compile time, runtime, exit code, and memory usage."
                />
                <FeatureCard
                  title="Persistent Sessions"
                  text="Language, snippets, stdin, and successful run history stored locally."
                />
                <FeatureCard
                  title="Run Restore"
                  text="Restore previous successful runs with one click."
                />
                <FeatureCard
                  title="DSA Mode"
                  text="Benchmark-based profiling with runtime and memory plots plus heuristic complexity estimation."
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function preview(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "-";
  return trimmed.length > 70 ? `${trimmed.slice(0, 70)}...` : trimmed;
}
