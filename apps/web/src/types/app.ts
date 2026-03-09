import type { RunResponse } from "../api";

export type RunHistoryItem = {
  id: string;
  createdAt: string;
  language: "python" | "cpp" | "java" | "c";
  mode: "normal" | "dsa";
  status: RunResponse["status"];
  exitCode: number | null;
  runtimeMs: number | null;
  compileTimeMs: number | null;
  memoryKb: number | null;
  stdoutPreview: string;
  stderrPreview: string;
  codeSnapshot: string;
  stdinSnapshot: string;
  resultSnapshot: RunResponse;
};
