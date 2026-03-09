import type { Language, Mode, RunResponse } from "../api";
import type { RunHistoryItem } from "../types/app";

export const starterCode: Record<Language, string> = {
  python: `def solve():
    print(input()[::-1])

solve()
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    string s;
    cin >> s;
    cout << s << endl;
    return 0;
}
`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.nextLine();
        System.out.println(s);
    }
}
`,
  c: `#include <stdio.h>

int main(void) {
    char s[256];
    scanf("%255s", s);
    printf("%s\\n", s);
    return 0;
}
`
};

export const labels: Record<Language, string> = {
  python: "Python",
  cpp: "C++",
  java: "Java",
  c: "C"
};

export const monacoLanguages: Record<Language, string> = {
  python: "python",
  cpp: "cpp",
  java: "java",
  c: "c"
};

export const initialRunState: RunResponse = {
  status: "queued",
  language: "python",
  stdout: "",
  stderr: "Run your code to see stdout and stderr here.",
  exit_code: null,
  metrics: null,
  benchmark: null,
  unsupported_reason: null
};

export function preview(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "-";
  return trimmed.length > 70 ? `${trimmed.slice(0, 70)}...` : trimmed;
}

export function normalizeHistoryItem(item: Partial<RunHistoryItem>): RunHistoryItem {
  const rawLanguage = item.language;
  const language: Language =
    rawLanguage === "python" ||
    rawLanguage === "cpp" ||
    rawLanguage === "java" ||
    rawLanguage === "c"
      ? rawLanguage
      : "python";

  const rawMode = item.mode;
  const mode: Mode = rawMode === "dsa" ? "dsa" : "normal";

  const resultSnapshot: RunResponse = item.resultSnapshot ?? {
    status: item.status ?? "error",
    language,
    stdout: item.stdoutPreview && item.stdoutPreview !== "-" ? item.stdoutPreview : "",
    stderr: item.stderrPreview && item.stderrPreview !== "-" ? item.stderrPreview : "",
    exit_code: item.exitCode ?? null,
    metrics: {
      wall_time_ms: item.runtimeMs ?? null,
      cpu_time_ms: null,
      peak_memory_kb: item.memoryKb ?? null,
      compile_time_ms: item.compileTimeMs ?? null
    },
    benchmark: null,
    unsupported_reason: null
  };

  return {
    id: item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: item.createdAt ?? new Date().toLocaleString(),
    language,
    mode,
    status: item.status ?? "error",
    exitCode: item.exitCode ?? null,
    runtimeMs: item.runtimeMs ?? null,
    compileTimeMs: item.compileTimeMs ?? null,
    memoryKb: item.memoryKb ?? null,
    stdoutPreview: item.stdoutPreview ?? "-",
    stderrPreview: item.stderrPreview ?? "-",
    codeSnapshot: typeof item.codeSnapshot === "string" ? item.codeSnapshot : starterCode[language],
    stdinSnapshot: typeof item.stdinSnapshot === "string" ? item.stdinSnapshot : "",
    resultSnapshot
  };
}
