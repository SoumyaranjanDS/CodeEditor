from typing import Literal

from pydantic import BaseModel, Field


Language = Literal["python", "cpp", "java", "c"]
RunStatus = Literal["queued", "running", "completed", "error", "timeout"]


class HealthResponse(BaseModel):
    status: Literal["ok"]


class RunMetrics(BaseModel):
    wall_time_ms: float | None = None
    cpu_time_ms: float | None = None
    peak_memory_kb: int | None = None
    compile_time_ms: float | None = None


class BenchmarkSummary(BaseModel):
    runs: list[RunMetrics]
    mean_wall_time_ms: float | None = None
    min_wall_time_ms: float | None = None
    max_wall_time_ms: float | None = None
    mean_peak_memory_kb: float | None = None


class RunRequest(BaseModel):
    language: Language
    code: str = Field(min_length=1, max_length=100_000)
    stdin: str = Field(default="", max_length=65_536)
    mode: Literal["normal", "dsa"] = "normal"
    benchmark_runs: int = Field(default=3, ge=1, le=10)


class RunResponse(BaseModel):
    status: RunStatus
    language: Language
    stdout: str
    stderr: str
    exit_code: int | None
    metrics: RunMetrics | None
    benchmark: BenchmarkSummary | None = None
    unsupported_reason: str | None = None
