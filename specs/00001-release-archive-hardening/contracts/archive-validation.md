# Archive Validation Contract

| Symbol | Signature | Result / Failure |
|--------|-----------|------------------|
| `inspectArchiveEntries` | `(archivePath) => ArchiveEntry[]` | Normalized ZIP names plus type metadata; throws for unreadable archive. |
| `assertSafeArchiveEntries` | `(tool, entries) => void` | Rejects unsafe paths, symlinks, and `sdd-pilot-<tool>/` top-level wrappers. |
| `assertReleaseArchiveLayout` | `(tool, archivePath) => void` | Requires direct discovery roots after safe admission and extraction. |
| `discoverLocalModuleClosure` | `(directory, entries) => Set<string>` | Traverses relative static and string-literal dynamic `.mjs` imports with a visited set. |
| `validateExtractedRelease` | `(directory) => void` | Requires runtime manifest and importable local closure from extracted bytes. |
| `validateReleaseArchive` | `(archivePath) => void` | Admits, extracts, and validates one archive; always removes temporary output. |
| `ensureImplementStateIgnored` | `(projectRoot) => void` | Appends `.implement-state` exactly once or throws without changing an unsafe/unwritable file. |
