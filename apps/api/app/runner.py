import os
import re
import subprocess
import sys
import tempfile
import time

import psutil

from .schemas import BenchmarkSummary, RunMetrics, RunRequest, RunResponse

MAX_OUTPUT_CHARS = 65536
TIME_LIMIT_SECONDS = 5
UNSUPPORTED_MESSAGE = "This language runner is not implemented yet. Start with Python, C, C++, or Java for the current MVP."


def execute_run(payload: RunRequest) -> RunResponse:
    if payload.mode == "dsa":
        return execute_benchmark(payload)

    return execute_once(payload)


def execute_once(payload: RunRequest) -> RunResponse:
    if payload.language == "python":
        return execute_python(payload)

    if payload.language == "cpp":
        return execute_cpp(payload)

    if payload.language == "c":
        return execute_c(payload)

    if payload.language == "java":
        return execute_java(payload)

    return RunResponse(
        status="error",
        language=payload.language,
        stdout="",
        stderr=UNSUPPORTED_MESSAGE,
        exit_code=None,
        metrics=RunMetrics(
            wall_time_ms=None,
            cpu_time_ms=None,
            peak_memory_kb=None,
            compile_time_ms=None,
        ),
        benchmark=None,
        unsupported_reason=UNSUPPORTED_MESSAGE,
    )


def execute_python(payload: RunRequest) -> RunResponse:
    start_wall = time.perf_counter()

    with tempfile.TemporaryDirectory(prefix="auracode-") as tmpdir:
        source_path = os.path.join(tmpdir, "main.py")

        with open(source_path, "w", encoding="utf-8") as source_file:
            source_file.write(payload.code)

        process = subprocess.Popen(
            [sys.executable, source_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=tmpdir,
        )

        peak_rss = 0
        peak_cpu_seconds = 0.0

        try:
            ps_process = psutil.Process(process.pid)
        except Exception:
            ps_process = None

        try:
            stdout, stderr = process.communicate(
                input=payload.stdin,
                timeout=TIME_LIMIT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()

            return RunResponse(
                status="timeout",
                language=payload.language,
                stdout=truncate_output(stdout),
                stderr=truncate_output(stderr or "Execution timed out after 5 seconds."),
                exit_code=None,
                metrics=RunMetrics(
                    wall_time_ms=round((time.perf_counter() - start_wall) * 1000, 2),
                    cpu_time_ms=round(peak_cpu_seconds * 1000, 2),
                    peak_memory_kb=peak_rss // 1024,
                    compile_time_ms=0,
                ),
                benchmark=None,
                unsupported_reason=None,
            )

        if ps_process is not None:
            try:
                memory = ps_process.memory_info().rss
                cpu_times = ps_process.cpu_times()
                peak_rss = max(peak_rss, memory)
                peak_cpu_seconds = max(peak_cpu_seconds, cpu_times.user + cpu_times.system)
            except psutil.Error:
                pass

    return RunResponse(
        status="completed" if process.returncode == 0 else "error",
        language=payload.language,
        stdout=truncate_output(stdout),
        stderr=truncate_output(stderr),
        exit_code=process.returncode,
        metrics=RunMetrics(
            wall_time_ms=round((time.perf_counter() - start_wall) * 1000, 2),
            cpu_time_ms=round(peak_cpu_seconds * 1000, 2),
            peak_memory_kb=peak_rss // 1024,
            compile_time_ms=0,
        ),
        benchmark=None,
        unsupported_reason=None,
    )


def execute_cpp(payload: RunRequest) -> RunResponse:
    start_wall = time.perf_counter()

    with tempfile.TemporaryDirectory(prefix="auracode-") as tmpdir:
        source_path = os.path.join(tmpdir, "main.cpp")
        executable_path = os.path.join(tmpdir, "main.exe" if os.name == "nt" else "main.out")

        with open(source_path, "w", encoding="utf-8") as source_file:
            source_file.write(payload.code)

        compile_start = time.perf_counter()
        compile_process = subprocess.run(
            ["g++", source_path, "-std=c++17", "-O2", "-o", executable_path],
            capture_output=True,
            text=True,
            cwd=tmpdir,
            timeout=TIME_LIMIT_SECONDS,
        )
        compile_time_ms = round((time.perf_counter() - compile_start) * 1000, 2)

        if compile_process.returncode != 0:
            return RunResponse(
                status="error",
                language=payload.language,
                stdout=truncate_output(compile_process.stdout),
                stderr=truncate_output(compile_process.stderr),
                exit_code=compile_process.returncode,
                metrics=RunMetrics(
                    wall_time_ms=round((time.perf_counter() - start_wall) * 1000, 2),
                    cpu_time_ms=0,
                    peak_memory_kb=0,
                    compile_time_ms=compile_time_ms,
                ),
                benchmark=None,
                unsupported_reason=None,
            )

        process = subprocess.Popen(
            [executable_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=tmpdir,
        )

        peak_rss = 0
        peak_cpu_seconds = 0.0

        try:
            ps_process = psutil.Process(process.pid)
        except Exception:
            ps_process = None

        try:
            stdout, stderr = process.communicate(
                input=payload.stdin,
                timeout=TIME_LIMIT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()

            return RunResponse(
                status="timeout",
                language=payload.language,
                stdout=truncate_output(stdout),
                stderr=truncate_output(stderr or "Execution timed out after 5 seconds."),
                exit_code=None,
                metrics=RunMetrics(
                    wall_time_ms=round((time.perf_counter() - start_wall) * 1000, 2),
                    cpu_time_ms=round(peak_cpu_seconds * 1000, 2),
                    peak_memory_kb=peak_rss // 1024,
                    compile_time_ms=compile_time_ms,
                ),
                benchmark=None,
                unsupported_reason=None,
            )

        if ps_process is not None:
            try:
                memory = ps_process.memory_info().rss
                cpu_times = ps_process.cpu_times()
                peak_rss = max(peak_rss, memory)
                peak_cpu_seconds = max(peak_cpu_seconds, cpu_times.user + cpu_times.system)
            except psutil.Error:
                pass

    return RunResponse(
        status="completed" if process.returncode == 0 else "error",
        language=payload.language,
        stdout=truncate_output(stdout),
        stderr=truncate_output(stderr),
        exit_code=process.returncode,
        metrics=RunMetrics(
            wall_time_ms=round((time.perf_counter() - start_wall) * 1000, 2),
            cpu_time_ms=round(peak_cpu_seconds * 1000, 2),
            peak_memory_kb=peak_rss // 1024,
            compile_time_ms=compile_time_ms,
        ),
        benchmark=None,
        unsupported_reason=None,
    )


def execute_c(payload: RunRequest) -> RunResponse:
    start_wall = time.perf_counter()

    with tempfile.TemporaryDirectory(prefix="auracode-") as tmpdir:
        source_path = os.path.join(tmpdir, "main.c")
        executable_path = os.path.join(tmpdir, "main.exe" if os.name == "nt" else "main.out")

        with open(source_path, "w", encoding="utf-8") as source_file:
            source_file.write(payload.code)

        compile_start = time.perf_counter()
        compile_process = subprocess.run(
            ["gcc", source_path, "-O2", "-o", executable_path],
            capture_output=True,
            text=True,
            cwd=tmpdir,
            timeout=TIME_LIMIT_SECONDS,
        )
        compile_time_ms = round((time.perf_counter() - compile_start) * 1000, 2)

        if compile_process.returncode != 0:
            return RunResponse(
                status="error",
                language=payload.language,
                stdout=truncate_output(compile_process.stdout),
                stderr=truncate_output(compile_process.stderr),
                exit_code=compile_process.returncode,
                metrics=RunMetrics(
                    wall_time_ms=round((time.perf_counter() - start_wall) * 1000, 2),
                    cpu_time_ms=0,
                    peak_memory_kb=0,
                    compile_time_ms=compile_time_ms,
                ),
                benchmark=None,
                unsupported_reason=None,
            )

        process = subprocess.Popen(
            [executable_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=tmpdir,
        )

        peak_rss = 0
        peak_cpu_seconds = 0.0

        try:
            ps_process = psutil.Process(process.pid)
        except Exception:
            ps_process = None

        try:
            stdout, stderr = process.communicate(
                input=payload.stdin,
                timeout=TIME_LIMIT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()

            return RunResponse(
                status="timeout",
                language=payload.language,
                stdout=truncate_output(stdout),
                stderr=truncate_output(stderr or "Execution timed out after 5 seconds."),
                exit_code=None,
                metrics=RunMetrics(
                    wall_time_ms=round((time.perf_counter() - start_wall) * 1000, 2),
                    cpu_time_ms=round(peak_cpu_seconds * 1000, 2),
                    peak_memory_kb=peak_rss // 1024,
                    compile_time_ms=compile_time_ms,
                ),
                benchmark=None,
                unsupported_reason=None,
            )

        if ps_process is not None:
            try:
                memory = ps_process.memory_info().rss
                cpu_times = ps_process.cpu_times()
                peak_rss = max(peak_rss, memory)
                peak_cpu_seconds = max(peak_cpu_seconds, cpu_times.user + cpu_times.system)
            except psutil.Error:
                pass

    return RunResponse(
        status="completed" if process.returncode == 0 else "error",
        language=payload.language,
        stdout=truncate_output(stdout),
        stderr=truncate_output(stderr),
        exit_code=process.returncode,
        metrics=RunMetrics(
            wall_time_ms=round((time.perf_counter() - start_wall) * 1000, 2),
            cpu_time_ms=round(peak_cpu_seconds * 1000, 2),
            peak_memory_kb=peak_rss // 1024,
            compile_time_ms=compile_time_ms,
        ),
        benchmark=None,
        unsupported_reason=None,
    )


def execute_java(payload: RunRequest) -> RunResponse:
    start_wall = time.perf_counter()

    with tempfile.TemporaryDirectory(prefix="auracode-") as tmpdir:
        class_name = extract_java_class_name(payload.code)
        source_path = os.path.join(tmpdir, f"{class_name}.java")

        with open(source_path, "w", encoding="utf-8") as source_file:
            source_file.write(payload.code)

        compile_start = time.perf_counter()
        compile_process = subprocess.run(
            ["javac", source_path],
            capture_output=True,
            text=True,
            cwd=tmpdir,
            timeout=TIME_LIMIT_SECONDS,
        )
        compile_time_ms = round((time.perf_counter() - compile_start) * 1000, 2)

        if compile_process.returncode != 0:
            return RunResponse(
                status="error",
                language=payload.language,
                stdout=truncate_output(compile_process.stdout),
                stderr=truncate_output(compile_process.stderr),
                exit_code=compile_process.returncode,
                metrics=RunMetrics(
                    wall_time_ms=round((time.perf_counter() - start_wall) * 1000, 2),
                    cpu_time_ms=0,
                    peak_memory_kb=0,
                    compile_time_ms=compile_time_ms,
                ),
                benchmark=None,
                unsupported_reason=None,
            )

        process = subprocess.Popen(
            ["java", "-cp", tmpdir, class_name],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=tmpdir,
        )

        peak_rss = 0
        peak_cpu_seconds = 0.0

        try:
            ps_process = psutil.Process(process.pid)
        except Exception:
            ps_process = None

        try:
            stdout, stderr = process.communicate(
                input=payload.stdin,
                timeout=TIME_LIMIT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()

            return RunResponse(
                status="timeout",
                language=payload.language,
                stdout=truncate_output(stdout),
                stderr=truncate_output(stderr or "Execution timed out after 5 seconds."),
                exit_code=None,
                metrics=RunMetrics(
                    wall_time_ms=round((time.perf_counter() - start_wall) * 1000, 2),
                    cpu_time_ms=round(peak_cpu_seconds * 1000, 2),
                    peak_memory_kb=peak_rss // 1024,
                    compile_time_ms=compile_time_ms,
                ),
                benchmark=None,
                unsupported_reason=None,
            )

        if ps_process is not None:
            try:
                memory = ps_process.memory_info().rss
                cpu_times = ps_process.cpu_times()
                peak_rss = max(peak_rss, memory)
                peak_cpu_seconds = max(peak_cpu_seconds, cpu_times.user + cpu_times.system)
            except psutil.Error:
                pass

    return RunResponse(
        status="completed" if process.returncode == 0 else "error",
        language=payload.language,
        stdout=truncate_output(stdout),
        stderr=truncate_output(stderr),
        exit_code=process.returncode,
        metrics=RunMetrics(
            wall_time_ms=round((time.perf_counter() - start_wall) * 1000, 2),
            cpu_time_ms=round(peak_cpu_seconds * 1000, 2),
            peak_memory_kb=peak_rss // 1024,
            compile_time_ms=compile_time_ms,
        ),
        benchmark=None,
        unsupported_reason=None,
    )


def execute_benchmark(payload: RunRequest) -> RunResponse:
    samples: list[RunMetrics] = []
    final_response: RunResponse | None = None

    runs_to_execute = min(max(payload.benchmark_runs, 1), 10)

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

    wall_times = [item.wall_time_ms for item in samples if item.wall_time_ms is not None]
    memories = [item.peak_memory_kb for item in samples if item.peak_memory_kb is not None]

    if final_response is None:
        return RunResponse(
            status="error",
            language=payload.language,
            stdout="",
            stderr="Benchmark failed to execute.",
            exit_code=None,
            metrics=RunMetrics(
                wall_time_ms=None,
                cpu_time_ms=None,
                peak_memory_kb=None,
                compile_time_ms=None,
            ),
            benchmark=None,
            unsupported_reason=None,
        )

    final_response.benchmark = BenchmarkSummary(
        runs=samples,
        mean_wall_time_ms=round(sum(wall_times) / len(wall_times), 2) if wall_times else None,
        min_wall_time_ms=round(min(wall_times), 2) if wall_times else None,
        max_wall_time_ms=round(max(wall_times), 2) if wall_times else None,
        mean_peak_memory_kb=round(sum(memories) / len(memories), 2) if memories else None,
    )

    return final_response


def extract_java_class_name(code: str) -> str:
    match = re.search(r"public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)", code)
    if match:
        return match.group(1)

    match = re.search(r"class\s+([A-Za-z_][A-Za-z0-9_]*)", code)
    if match:
        return match.group(1)

    return "Main"


def truncate_output(value: str) -> str:
    if len(value) <= MAX_OUTPUT_CHARS:
        return value

    return value[:MAX_OUTPUT_CHARS] + "\n\n[output truncated]"
