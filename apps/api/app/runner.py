from __future__ import annotations

import os
import re
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass

import psutil

from .config import get_settings
from .schemas import BenchmarkSummary, RunMetrics, RunRequest, RunResponse, RunStatus

settings = get_settings()
EXECUTABLE_NAME = "main.exe" if os.name == "nt" else "main.out"
UNSUPPORTED_MESSAGE = (
    "This language runner is not implemented yet. Start with Python, C, C++, or Java "
    "for the current MVP."
)


@dataclass(frozen=True)
class ProcessResult:
    status: RunStatus
    stdout: str
    stderr: str
    exit_code: int | None
    cpu_time_ms: float | None
    peak_memory_kb: int | None


@dataclass(frozen=True)
class CompileResult:
    success: bool
    compile_time_ms: float
    stdout: str
    stderr: str
    exit_code: int | None
    timeout_message: str | None = None


def execute_run(payload: RunRequest) -> RunResponse:
    if payload.mode == "dsa":
        return execute_benchmark(payload)
    return execute_once(payload)


def execute_once(payload: RunRequest) -> RunResponse:
    handlers = {
        "python": execute_python,
        "cpp": execute_cpp,
        "c": execute_c,
        "java": execute_java,
    }
    handler = handlers.get(payload.language)
    if handler is None:
        return build_unsupported_response(payload.language)
    return handler(payload)


def execute_python(payload: RunRequest) -> RunResponse:
    started_at = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="auracode-") as tmpdir:
        source_path = os.path.join(tmpdir, "main.py")
        write_source_file(source_path, payload.code)
        process_result = run_process(
            [sys.executable, source_path],
            cwd=tmpdir,
            stdin_text=payload.stdin,
            timeout_seconds=settings.run_timeout_seconds,
            timeout_message=f"Execution timed out after {settings.run_timeout_seconds} seconds.",
        )
    return build_response(payload.language, process_result, started_at, compile_time_ms=0)


def execute_cpp(payload: RunRequest) -> RunResponse:
    return execute_native(payload, source_name="main.cpp", compile_command=["g++", "-std=c++17", "-O2"])


def execute_c(payload: RunRequest) -> RunResponse:
    return execute_native(payload, source_name="main.c", compile_command=["gcc", "-O2"])


def execute_native(payload: RunRequest, source_name: str, compile_command: list[str]) -> RunResponse:
    started_at = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="auracode-") as tmpdir:
        source_path = os.path.join(tmpdir, source_name)
        executable_path = os.path.join(tmpdir, EXECUTABLE_NAME)
        write_source_file(source_path, payload.code)

        compile_result = run_compile(
            [*compile_command, source_path, "-o", executable_path],
            cwd=tmpdir,
        )
        if not compile_result.success:
            return build_compile_failure_response(
                language=payload.language,
                started_at=started_at,
                compile_result=compile_result,
            )

        process_result = run_process(
            [executable_path],
            cwd=tmpdir,
            stdin_text=payload.stdin,
            timeout_seconds=settings.run_timeout_seconds,
            timeout_message=f"Execution timed out after {settings.run_timeout_seconds} seconds.",
        )

    return build_response(
        payload.language,
        process_result,
        started_at,
        compile_time_ms=compile_result.compile_time_ms,
    )


def execute_java(payload: RunRequest) -> RunResponse:
    started_at = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="auracode-") as tmpdir:
        class_name = extract_java_class_name(payload.code)
        source_path = os.path.join(tmpdir, f"{class_name}.java")
        write_source_file(source_path, payload.code)

        compile_result = run_compile(["javac", source_path], cwd=tmpdir)
        if not compile_result.success:
            return build_compile_failure_response(
                language=payload.language,
                started_at=started_at,
                compile_result=compile_result,
            )

        process_result = run_process(
            ["java", "-cp", tmpdir, class_name],
            cwd=tmpdir,
            stdin_text=payload.stdin,
            timeout_seconds=settings.run_timeout_seconds,
            timeout_message=f"Execution timed out after {settings.run_timeout_seconds} seconds.",
        )

    return build_response(
        payload.language,
        process_result,
        started_at,
        compile_time_ms=compile_result.compile_time_ms,
    )


def execute_benchmark(payload: RunRequest) -> RunResponse:
    samples: list[RunMetrics] = []
    final_response: RunResponse | None = None
    runs_to_execute = min(payload.benchmark_runs, settings.max_benchmark_runs)

    for _ in range(runs_to_execute):
        result = execute_once(
            RunRequest(
                language=payload.language,
                code=payload.code,
                stdin=payload.stdin,
                mode="normal",
                benchmark_runs=1,
            )
        )

        if result.status != "completed" or result.metrics is None:
            result.benchmark = None
            return result

        samples.append(result.metrics)
        final_response = result

    if final_response is None:
        return RunResponse(
            status="error",
            language=payload.language,
            stdout="",
            stderr="Benchmark failed to execute.",
            exit_code=None,
            metrics=RunMetrics(),
            benchmark=None,
            unsupported_reason=None,
        )

    wall_times = [sample.wall_time_ms for sample in samples if sample.wall_time_ms is not None]
    memories = [sample.peak_memory_kb for sample in samples if sample.peak_memory_kb is not None]

    final_response.benchmark = BenchmarkSummary(
        runs=samples,
        mean_wall_time_ms=round(sum(wall_times) / len(wall_times), 2) if wall_times else None,
        min_wall_time_ms=round(min(wall_times), 2) if wall_times else None,
        max_wall_time_ms=round(max(wall_times), 2) if wall_times else None,
        mean_peak_memory_kb=round(sum(memories) / len(memories), 2) if memories else None,
    )
    return final_response


def run_compile(command: list[str], cwd: str) -> CompileResult:
    compile_started_at = time.perf_counter()

    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            cwd=cwd,
            timeout=settings.compile_timeout_seconds,
        )
    except subprocess.TimeoutExpired:
        return CompileResult(
            success=False,
            compile_time_ms=round((time.perf_counter() - compile_started_at) * 1000, 2),
            stdout="",
            stderr="",
            exit_code=None,
            timeout_message=(
                f"Compilation timed out after {settings.compile_timeout_seconds} seconds."
            ),
        )
    except FileNotFoundError:
        return CompileResult(
            success=False,
            compile_time_ms=round((time.perf_counter() - compile_started_at) * 1000, 2),
            stdout="",
            stderr=f"Required compiler not found: {command[0]}",
            exit_code=None,
        )

    compile_time_ms = round((time.perf_counter() - compile_started_at) * 1000, 2)
    return CompileResult(
        success=completed.returncode == 0,
        compile_time_ms=compile_time_ms,
        stdout=completed.stdout,
        stderr=completed.stderr,
        exit_code=completed.returncode,
    )


def run_process(
    command: list[str],
    *,
    cwd: str,
    stdin_text: str,
    timeout_seconds: int,
    timeout_message: str,
) -> ProcessResult:
    try:
        process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=cwd,
        )
    except FileNotFoundError:
        return ProcessResult(
            status="error",
            stdout="",
            stderr=f"Required runtime not found: {command[0]}",
            exit_code=None,
            cpu_time_ms=None,
            peak_memory_kb=None,
        )

    ps_process: psutil.Process | None
    try:
        ps_process = psutil.Process(process.pid)
    except Exception:
        ps_process = None

    try:
        stdout, stderr = process.communicate(input=stdin_text, timeout=timeout_seconds)
    except subprocess.TimeoutExpired:
        process.kill()
        stdout, stderr = process.communicate()
        cpu_time_ms, peak_memory_kb = collect_metrics(ps_process)
        return ProcessResult(
            status="timeout",
            stdout=truncate_output(stdout),
            stderr=truncate_output(stderr or timeout_message),
            exit_code=None,
            cpu_time_ms=cpu_time_ms,
            peak_memory_kb=peak_memory_kb,
        )

    cpu_time_ms, peak_memory_kb = collect_metrics(ps_process)
    return ProcessResult(
        status="completed" if process.returncode == 0 else "error",
        stdout=truncate_output(stdout),
        stderr=truncate_output(stderr),
        exit_code=process.returncode,
        cpu_time_ms=cpu_time_ms,
        peak_memory_kb=peak_memory_kb,
    )


def collect_metrics(ps_process: psutil.Process | None) -> tuple[float | None, int | None]:
    if ps_process is None:
        return None, None

    try:
        memory_info = ps_process.memory_info().rss
        cpu_times = ps_process.cpu_times()
    except (psutil.Error, ProcessLookupError):
        return None, None

    return round((cpu_times.user + cpu_times.system) * 1000, 2), memory_info // 1024


def build_response(
    language: str,
    process_result: ProcessResult,
    started_at: float,
    *,
    compile_time_ms: float | None,
) -> RunResponse:
    return RunResponse(
        status=process_result.status,
        language=language,
        stdout=process_result.stdout,
        stderr=process_result.stderr,
        exit_code=process_result.exit_code,
        metrics=RunMetrics(
            wall_time_ms=round((time.perf_counter() - started_at) * 1000, 2),
            cpu_time_ms=process_result.cpu_time_ms,
            peak_memory_kb=process_result.peak_memory_kb,
            compile_time_ms=compile_time_ms,
        ),
        benchmark=None,
        unsupported_reason=None,
    )


def build_compile_failure_response(
    *,
    language: str,
    started_at: float,
    compile_result: CompileResult,
) -> RunResponse:
    status: RunStatus = "timeout" if compile_result.timeout_message else "error"
    stderr = compile_result.timeout_message or truncate_output(compile_result.stderr)
    return RunResponse(
        status=status,
        language=language,
        stdout=truncate_output(compile_result.stdout),
        stderr=stderr,
        exit_code=compile_result.exit_code,
        metrics=RunMetrics(
            wall_time_ms=round((time.perf_counter() - started_at) * 1000, 2),
            cpu_time_ms=None,
            peak_memory_kb=None,
            compile_time_ms=compile_result.compile_time_ms,
        ),
        benchmark=None,
        unsupported_reason=None,
    )


def build_unsupported_response(language: str) -> RunResponse:
    return RunResponse(
        status="error",
        language=language,
        stdout="",
        stderr=UNSUPPORTED_MESSAGE,
        exit_code=None,
        metrics=RunMetrics(),
        benchmark=None,
        unsupported_reason=UNSUPPORTED_MESSAGE,
    )


def write_source_file(path: str, code: str) -> None:
    with open(path, "w", encoding="utf-8") as source_file:
        source_file.write(code)


def extract_java_class_name(code: str) -> str:
    match = re.search(r"public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)", code)
    if match:
        return match.group(1)

    match = re.search(r"class\s+([A-Za-z_][A-Za-z0-9_]*)", code)
    if match:
        return match.group(1)

    return "Main"


def truncate_output(value: str | None) -> str:
    text = value or ""
    if len(text) <= settings.max_output_chars:
        return text
    return text[: settings.max_output_chars] + "\n\n[output truncated]"
