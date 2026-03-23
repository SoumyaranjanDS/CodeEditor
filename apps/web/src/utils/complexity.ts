import type { Language } from "../api";

export type ComplexityEstimate = {
  time: string;
  space: string;
  notes: string[];
};

export function estimateComplexity(code: string, language: Language): ComplexityEstimate {
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
    notes.push("Graph-oriented structure or pattern detected.");
    if (time === "Unknown") {
      time = "Likely O(V + E)";
    }
    if (space === "O(1) auxiliary (estimated)") {
      space = "Likely O(V)";
    }
  }

  if (hasDP) {
    notes.push("DP or memoization style storage detected.");
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

export function clampBenchmarkRuns(value: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.min(Math.max(value, 1), 10);
}

export function fileExtension(language: Language): string {
  if (language === "python") return "py";
  if (language === "cpp") return "cpp";
  if (language === "java") return "java";
  return "c";
}

function detectRecursion(code: string, language: Language): boolean {
  if (language === "python") {
    const match = code.match(/def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    return !!(match && code.includes(`${match[1]}(`, match.index! + match[0].length));
  }

  const match = code.match(
    /(public|private|protected|static|\s)+\s*[A-Za-z_<>[\]]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/
  );
  return !!(match && code.includes(`${match[2]}(`, match.index! + match[0].length));
}

function countLoops(normalized: string): number {
  const forCount = (normalized.match(/\bfor\s*\(/g) || []).length;
  const whileCount = (normalized.match(/\bwhile\s*\(/g) || []).length;
  return forCount + whileCount;
}
