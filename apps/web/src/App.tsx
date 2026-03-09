import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { Play, RotateCcw, TerminalSquare, Trash2, X } from "lucide-react";
import type { Language, Mode, RunResponse } from "./api";
import { runCode } from "./api";
import FeatureCard from "./components/FeatureCard";
import Header from "./components/Header";
import HistoryBadge from "./components/HistoryBadge";
import MetricCard from "./components/MetricCard";
import ModeButton from "./components/ModeButton";
import Panel from "./components/Panel";
import { useLocalStorage } from "./hooks/useLocalStorage";
import type { RunHistoryItem } from "./types/app";
import {
  initialRunState,
  labels,
  monacoLanguages,
  normalizeHistoryItem,
  preview,
  starterCode
} from "./utils/history";
import { STORAGE_KEYS } from "./utils/storage";

function getInitialLanguage(): Language {
  const value = localStorage.getItem(STORAGE_KEYS.language);
  return value === "python" || value === "cpp" || value === "java" || value === "c"
    ? value
    : "python";
}

function getInitialMode(): Mode {
  const value = localStorage.getItem(STORAGE_KEYS.mode);
  return value === "normal" || value === "dsa" ? value : "normal";
}

function getInitialSnippets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.snippets);
    if (!raw) return starterCode;
    return { ...starterCode, ...JSON.parse(raw) };
  } catch {
    return starterCode;
  }
}

function getInitialHistory(): RunHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeHistoryItem) : [];
  } catch {
    return [];
  }
}

type ComplexityEstimate = {
  time: string;
  space: string;
  notes: string[];
};

function estimateComplexity(code: string, language: Language): ComplexityEstimate {
  const normalized = code.toLowerCase();

  const notes: string[] = [];
  let time = "Unknown";
  let space = "O(1) auxiliary (estimated)";

  const hasSort =
    normalized.includes(".sort(") ||
    normalized.includes("arrays.sort") ||
    normalized.includes("collections.sort") ||
    normalized.includes("sort(");

  const hasRecursion = detectRecursion(code, language);
  const loopCount = countLoops(normalized);
  const hasQueue =
    normalized.includes("queue") ||
    normalized.includes("deque") ||
    normalized.includes("linkedlist");
  const hasStack =
    normalized.includes("stack") ||
    normalized.includes("push(") ||
    normalized.includes("pop(");
  const hasHash =
    normalized.includes("hashmap") ||
    normalized.includes("unordered_map") ||
    normalized.includes("map<") ||
    normalized.includes("dictionary") ||
    normalized.includes("set<") ||
    normalized.includes("hashset");
  const hasGraphSignals =
    normalized.includes("adj") ||
    normalized.includes("graph") ||
    normalized.includes("bfs") ||
    normalized.includes("dfs");
  const hasDP =
    normalized.includes("dp[") ||
    normalized.includes("vector<vector") ||
    normalized.includes("memo") ||
    normalized.includes("tabulation");

  if (hasSort) {
    time = "Likely O(n log n)";
    notes.push("Sorting call detected.");
  }

  if (loopCount >= 2 && !hasSort) {
    time = "Possible O(n^2)";
    notes.push("Nested loop pattern detected.");
  } else if (loopCount === 1 && !hasSort) {
    time = "Likely O(n)";
    notes.push("Single loop pattern detected.");
  }

  if (hasRecursion) {
    notes.push("Recursion detected.");
    if (time === "Unknown") {
      time = "Recursive complexity depends on branching and subproblem size";
    }
    space = "Likely O(recursion depth)";
  }

  if (hasHash) {
    notes.push("Hash-based structure detected.");
    if (space === "O(1) auxiliary (estimated)") {
      space = "Likely O(n)";
    }
  }

  if (hasQueue || hasStack) {
    notes.push("Explicit auxiliary data structure detected.");
    if (space === "O(1) auxiliary (estimated)") {
      space = "Likely O(n)";
    }
  }

  if (hasGraphSignals) {
    notes.push("Graph-oriented structure/pattern detected.");
    if (time === "Unknown") {
      time = "Likely O(V + E)";
    }
    if (space === "O(1) auxiliary (estimated)") {
      space = "Likely O(V)";
    }
  }

  if (hasDP) {
    notes.push("DP/memoization style storage detected.");
    space = "Likely O(n) or higher";
    if (time === "Unknown") {
      time = "Problem-dependent DP complexity";
    }
  }

  if (time === "Unknown") {
    time = "Estimated from benchmark only";
    notes.push("No strong static pattern detected.");
  }

  return { time, space, notes };
}

function detectRecursion(code: string, language: Language): boolean {
  if (language === "python") {
    const match = code.match(/def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    return !!(match && code.includes(`${match[1]}(`, match.index! + match[0].length));
  }

  const match = code.match(
    /(public|private|protected|static|\s)+\s*[A-Za-z_<>\[\]]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/
  );
  return !!(match && code.includes(`${match[2]}(`, match.index! + match[0].length));
}

function countLoops(normalized: string): number {
  const forCount = (normalized.match(/\bfor\s*\(/g) || []).length;
  const whileCount = (normalized.match(/\bwhile\s*\(/g) || []).length;
  return forCount + whileCount;
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
    localStorage.setItem(STORAGE_KEYS.language, language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.mode, mode);
  }, [mode]);

  useEffect(() => {
    setCode(snippets[language]);
  }, [language, snippets]);

  function handleLanguageChange(next: Language) {
    setLanguage(next);
    setRunState({
      ...initialRunState,
      language: next,
      stderr: initialRunState.stderr
    });
    setRequestError(null);
  }

  function handleCodeChange(value: string) {
    setCode(value);
    setSnippets((current) => ({
      ...current,
      [language]: value
    }));
  }

  function handleResetCurrentLanguage() {
    const resetValue = starterCode[language];
    setCode(resetValue);
    setSnippets((current) => ({
      ...current,
      [language]: resetValue
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
      [item.language]: item.codeSnapshot
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
      resultSnapshot: result
    };

    setRunHistory((current) => [item, ...current].slice(0, 12));
  }

  async function handleRun() {
    setIsRunning(true);
    setRequestError(null);
    setRunState((current) => ({
      ...current,
      status: "running",
      language
    }));

    try {
      const result = await runCode({
        language,
        code,
        stdin,
        mode,
        benchmark_runs: benchmarkRuns
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
          "Could not reach the API. Make sure the FastAPI server is running on port 8000."
      });
    } finally {
      setIsRunning(false);
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

  const outputText = useMemo(() => {
    const parts = [runState.stdout?.trim(), runState.stderr?.trim()].filter(Boolean);
    return parts.length ? parts.join("\n\n") : "No output yet.";
  }, [runState]);

  const complexity = useMemo(
    () => estimateComplexity(code, language),
    [code, language]
  );

  return (
    <main className="min-h-screen bg-[#1e1e1e] text-[#d4d4d4]">
      <div className="mx-auto flex min-h-screen max-w-400 flex-col">
        <Header
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          setDetailsOpen={setDetailsOpen}
        />

        <div className="flex-1 p-2 sm:p-3 lg:p-4">
          <div className="grid gap-3 lg:gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.82fr)] xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.75fr)]">
            <section className="order-1 flex min-w-0 flex-col gap-4">
              <section className="overflow-hidden rounded-xl border border-[#2d2d30] bg-[#252526] shadow-sm">
                <div className="flex flex-col gap-3 border-b border-[#2d2d30] bg-[#2d2d30] px-3 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {(Object.keys(labels) as Language[]).map((item) => (
                      <button
                        key={item}
                        className={`rounded-md px-3 py-2 font-mono text-sm transition ${
                          item === language
                            ? "bg-[#094771] text-white"
                            : "bg-[#1e1e1e] text-[#cccccc] hover:bg-[#37373d]"
                        }`}
                        onClick={() => handleLanguageChange(item)}
                        type="button"
                      >
                        {labels[item]}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-lg border border-[#3c3c3c] bg-[#1e1e1e] p-1">
                      <ModeButton active={mode === "normal"} onClick={() => setMode("normal")}>
                        Normal
                      </ModeButton>
                      <ModeButton active={mode === "dsa"} onClick={() => setMode("dsa")}>
                        DSA
                      </ModeButton>
                    </div>

                    <button
                      className="inline-flex items-center gap-2 rounded-md border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm font-medium text-[#cccccc] hover:bg-[#37373d]"
                      onClick={handleResetCurrentLanguage}
                      type="button"
                    >
                      <RotateCcw size={14} />
                      Reset
                    </button>

                    <button
                      className="inline-flex items-center gap-2 rounded-md bg-[#0e639c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1177bb] disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => void handleRun()}
                      type="button"
                      disabled={isRunning}
                    >
                      <Play size={14} />
                      {isRunning ? "Running..." : "Run"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-b border-[#2d2d30] bg-[#2d2d30] px-4 py-2">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                  <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                  <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                  <span className="ml-3 font-mono text-xs uppercase tracking-[0.24em] text-[#8c8c8c]">
                    main.
                    {language === "python"
                      ? "py"
                      : language === "cpp"
                        ? "cpp"
                        : language === "java"
                          ? "java"
                          : "c"}
                  </span>
                </div>

                <div className="h-80 sm:h-105 md:h-125 xl:h-140">
                  <Editor
                    height="100%"
                    language={monacoLanguages[language]}
                    value={code}
                    onChange={(value) => handleCodeChange(value ?? "")}
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
              </section>

              <section className="order-4 rounded-xl border border-[#2d2d30] bg-[#252526] p-4 shadow-sm lg:order-0">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.24em] text-[#8c8c8c]">
                    <TerminalSquare size={14} />
                    Recent Runs
                  </div>

                  <button
                    className="inline-flex items-center gap-2 rounded-md border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#cccccc] hover:bg-[#37373d] disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={clearRunHistory}
                    type="button"
                    disabled={runHistory.length === 0}
                  >
                    <Trash2 size={12} />
                    Clear All
                  </button>
                </div>

                <div className="-mx-1 overflow-x-auto pb-1">
                  <div className="flex min-w-max gap-3 px-1">
                    {runHistory.length === 0 ? (
                      <div className="w-70 sm:w-[320px] rounded-xl border border-[#2d2d30] bg-[#1e1e1e] p-4 text-sm text-[#8c8c8c]">
                        No runs saved yet.
                      </div>
                    ) : (
                      runHistory.map((item) => (
                        <div
                          key={item.id}
                          className="w-70 sm:w-[320px] shrink-0 rounded-xl border border-[#2d2d30] bg-[#1e1e1e] p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#8c8c8c]">
                                {item.language} • {item.mode}
                              </div>
                              <div className="mt-1 font-mono text-xs text-[#6b7280]">
                                {item.createdAt}
                              </div>
                            </div>

                            <button
                              className="rounded-md border border-[#5a1d1d] bg-[#3a1515] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#f87171] hover:bg-[#4a1b1b]"
                              onClick={() => deleteRunHistoryItem(item.id)}
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
                              onClick={() => restoreRun(item)}
                              type="button"
                            >
                              Restore
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </section>

            <aside className="order-2 flex min-w-0 flex-col gap-3 lg:gap-4">
              <Panel title="Execution">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Status" value={runState.status} tone="blue" />
                  <MetricCard label="Exit" value={exitCode} tone="orange" />
                  <MetricCard label="Compile" value={compileTime} tone="violet" />
                  <MetricCard label="Runtime" value={runtime} tone="green" />
                  <MetricCard label="Memory" value={memory} tone="orange" />
                </div>
              </Panel>

              <Panel title="Standard Input">
                <textarea
                  className="h-24 w-full resize-none rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] p-4 font-mono text-sm text-[#d4d4d4] outline-none placeholder:text-[#6b7280]"
                  placeholder="stdin goes here..."
                  value={stdin}
                  onChange={(event) => setStdin(event.target.value)}
                />
              </Panel>

              <Panel title="DSA Controls">
                <div className="space-y-3">
                  <label className="block text-sm text-[#cccccc]">Benchmark Runs</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={benchmarkRuns}
                    onChange={(e) => setBenchmarkRuns(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#d4d4d4] outline-none"
                  />
                </div>
              </Panel>

              <Panel title={mode === "normal" ? "Output" : "DSA Insights"}>
                {mode === "normal" ? (
                  <div className="space-y-3">
                    {requestError ? (
                      <div className="rounded-xl border border-[#5a1d1d] bg-[#3a1515] p-3 text-sm text-[#fca5a5]">
                        {requestError}
                      </div>
                    ) : null}
                    <pre className="min-h-42.5 whitespace-pre-wrap rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] p-4 font-mono text-sm leading-7 text-[#d4d4d4]">
                      {outputText}
                    </pre>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-[#2d4f6c] bg-[#1b2733] p-4 text-sm text-[#cbd5e1]">
                      <div className="space-y-2">
                        <p>
                          Status:{" "}
                          <span className="font-semibold text-white">{runState.status}</span>
                        </p>
                        <p>
                          Compile Time:{" "}
                          <span className="font-semibold text-white">{compileTime}</span>
                        </p>
                        <p>
                          Runtime Mean:{" "}
                          <span className="font-semibold text-white">
                            {runState.benchmark?.mean_wall_time_ms ?? "--"} ms
                          </span>
                        </p>
                        <p>
                          Runtime Min:{" "}
                          <span className="font-semibold text-white">
                            {runState.benchmark?.min_wall_time_ms ?? "--"} ms
                          </span>
                        </p>
                        <p>
                          Runtime Max:{" "}
                          <span className="font-semibold text-white">
                            {runState.benchmark?.max_wall_time_ms ?? "--"} ms
                          </span>
                        </p>
                        <p>
                          Mean Memory:{" "}
                          <span className="font-semibold text-white">
                            {runState.benchmark?.mean_peak_memory_kb ?? "--"} KB
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#2d4f6c] bg-[#1b2733] p-4 text-sm text-[#cbd5e1]">
                      <div className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-[#8c8c8c]">
                        Estimated Complexity
                      </div>

                      <div className="space-y-2">
                        <p>
                          Time: <span className="font-semibold text-white">{complexity.time}</span>
                        </p>
                        <p>
                          Space: <span className="font-semibold text-white">{complexity.space}</span>
                        </p>
                      </div>

                      <div className="mt-4 space-y-2">
                        {complexity.notes.map((note, index) => (
                          <div
                            key={index}
                            className="rounded-lg border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#d4d4d4]"
                          >
                            {note}
                          </div>
                        ))}
                      </div>
                    </div>

                    <BenchmarkChart runs={runState.benchmark?.runs ?? []} />

                    <div className="rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] p-4">
                      <div className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-[#8c8c8c]">
                        Benchmark Samples
                      </div>

                      <div className="max-h-55 overflow-y-auto pr-1">
                        <div className="flex flex-wrap gap-2">
                          {runState.benchmark?.runs?.length ? (
                            runState.benchmark.runs.map((sample, index) => (
                              <div
                                key={index}
                                className="min-w-35 rounded-lg border border-[#2d2d30] bg-[#252526] px-3 py-2 text-sm text-[#d4d4d4]"
                              >
                                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8c8c8c]">
                                  Run {index + 1}
                                </div>
                                <div className="mt-2">{sample.wall_time_ms ?? "--"} ms</div>
                                <div className="text-[#9ca3af]">
                                  {sample.peak_memory_kb ?? "--"} KB
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-[#8c8c8c]">
                              No benchmark samples yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Panel>
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
                  text="Benchmark-based profiling with runtime/memory plots and heuristic complexity estimation."
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function BenchmarkChart({
  runs
}: {
  runs: Array<{
    wall_time_ms: number | null;
    peak_memory_kb: number | null;
  }>;
}) {
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