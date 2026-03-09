export type Language = "python" | "cpp" | "java" | "c";
export type Mode = "normal" | "dsa";
export type RunStatus = "queued" | "running" | "completed" | "error" | "timeout";

export interface RunMetrics {
  wall_time_ms: number | null;
  cpu_time_ms: number | null;
  peak_memory_kb: number | null;
  compile_time_ms: number | null;
}

export interface BenchmarkSummary {
  runs: RunMetrics[];
  mean_wall_time_ms: number | null;
  min_wall_time_ms: number | null;
  max_wall_time_ms: number | null;
  mean_peak_memory_kb: number | null;
}

export interface RunResponse {
  status: RunStatus;
  language: Language;
  stdout: string;
  stderr: string;
  exit_code: number | null;
  metrics: RunMetrics | null;
  benchmark: BenchmarkSummary | null;
  unsupported_reason: string | null;
}

export interface RunRequest {
  language: Language;
  code: string;
  stdin: string;
  mode: Mode;
  benchmark_runs: number;
}

const API_BASE_URL = "https://auraeditor.onrender.com";

export async function runCode(payload: RunRequest): Promise<RunResponse> {
  const response = await fetch(`${API_BASE_URL}/api/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  if (!response.ok) {
    try {
      const parsed = JSON.parse(text) as { detail?: string };
      throw new Error(parsed.detail || `Run failed with status ${response.status}`);
    } catch {
      throw new Error(text || `Run failed with status ${response.status}`);
    }
  }

  return JSON.parse(text) as RunResponse;
}