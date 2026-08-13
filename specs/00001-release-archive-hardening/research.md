# Research: Release Archive Hardening
> 00001-release-archive-hardening | 2026-08-13 | Release integrity decisions

## Node ESM Closure
- **Decision**: Resolve only `./` and `../` static imports and string-literal `import()` calls relative to each extracted `.mjs` file; load every discovered module by file URL.
- **Rationale**: Node ESM requires explicit relative extensions and resolves relative specifiers by URL; a visited canonical-path set makes cycles finite.
- **Rejected**: Source-tree-only scanning and expression evaluation; they do not prove packaged bytes load and cannot resolve arbitrary runtime expressions safely.
- **Pitfalls**: Do not treat bare, `node:`, absolute, or non-literal dynamic specifiers as packaged-local dependencies.
- **Sources**: https://nodejs.org/api/esm.html#import-specifiers, https://nodejs.org/api/esm.html#import-expressions

## ZIP Admission
- **Decision**: List and reject unsafe, symlink, and `sdd-pilot-<tool>/` wrapper entries before extraction; extract only admitted archives into a temporary directory.
- **Rationale**: Archive entry paths and metadata must be validated before a consumer-like extraction can be trusted.
- **Rejected**: Relying on `unzip` path handling; extraction behavior is not an archive acceptance policy.
- **Pitfalls**: Normalize `./` and directory suffixes without losing top-level-entry identity; inspect verbose metadata for symlinks.
- **Sources**: https://manpages.debian.org/unstable/unzip/unzip.1.en.html, https://nodejs.org/api/esm.html#resolution-and-loading-algorithm

## Consumer Ignore Setup
- **Decision**: Exclude root `.gitignore` from release staging and append `.implement-state` only through an idempotent setup helper before checkpointing.
- **Rationale**: Direct extraction must not overwrite consumer bytes, while implementation state remains ignored.
- **Rejected**: Shipping a replacement root `.gitignore`; it can discard consumer rules.
- **Pitfalls**: Preserve existing bytes exactly, append only when absent, and fail before writing when the target cannot be safely updated.
- **Sources**: https://nodejs.org/api/fs.html, https://nodejs.org/api/esm.html#import-specifiers

## Summary
| Topic | Decision | Rationale |
|-------|----------|-----------|
| ESM closure | Resolve extracted relative `.mjs` graph | Proves runtime loadability |
| ZIP admission | Reject entries before extraction | Fails closed on unsafe content |
| Ignore setup | Append idempotently at setup | Preserves consumer rules |

## Sources Index
| URL | Topic | Fetched |
|-----|-------|---------|
| https://nodejs.org/api/esm.html#import-specifiers | Node ESM Closure | 2026-08-13 |
| https://nodejs.org/api/esm.html#import-expressions | Node ESM Closure | 2026-08-13 |
| https://manpages.debian.org/unstable/unzip/unzip.1.en.html | ZIP Admission | 2026-08-13 |
