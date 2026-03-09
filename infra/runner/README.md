# Runner Notes

This folder is reserved for the code execution layer.

## MVP plan

- local-only subprocess runner for development
- Python first, C++ second
- strict timeout
- strict output cap
- no optimization feedback here yet

## Public deployment direction

Before exposing AuraCode publicly, move execution to a hardened environment:

- locked-down container runner
- non-root user
- no network
- CPU and memory quotas
- output truncation
- optionally gVisor, Firecracker, or Judge0
