import { test } from "node:test";
import { equal, match, ok, throws } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  releaseRuntimeFiles,
  ensureImplementStateIgnored,
  stageReleaseRuntime,
  validateExtractedRelease,
  validateReleaseArchive,
} from "../scripts/release-runtime-manifest.mjs";
import { delegatedAgents, openCodeCoordinatorAgents } from "../scripts/lib/delegated-agents.mjs";

const release = readFileSync(fileURLToPath(new URL("../.github/workflows/release.yml", import.meta.url)), "utf8");
const root = fileURLToPath(new URL("..", import.meta.url));

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "release-runtime-"));
  cpSync(join(root, ".github"), join(directory, ".github"), { recursive: true });
  rmSync(join(directory, ".github", "workflows"), { recursive: true, force: true });
  cpSync(join(root, "AGENTS.md"), join(directory, "AGENTS.md"));
  cpSync(join(root, "project-instructions.md"), join(directory, "project-instructions.md"));
  stageReleaseRuntime(directory);
  return directory;
}

function copy(relativePath, directory) {
  const destination = join(directory, relativePath);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(join(root, relativePath), destination, { recursive: true });
}

function toolFixture(tool) {
  const directory = mkdtempSync(join(tmpdir(), `release-${tool}-`));
  const shared = [".github/sddp", ".github/skills", ".github/instructions", ".github/sddp-config.md", "AGENTS.md", "project-instructions.md"];
  const toolFiles = {
    antigravity: [".agents/workflows"],
    windsurf: [".windsurf/workflows", ".windsurf/rules"],
    opencode: [".opencode/agents", ".opencode/commands", "opencode.json"],
    "claude-code": [".claude/skills", ".claude/agents", ".claude/rules", ".claude/settings.json", "CLAUDE.md"],
    codex: [".agents/skills", ".codex/agents", ".codex/config.toml"],
  };

  if (tool === "copilot") {
    copy(".github", directory);
    copy(".vscode", directory);
    copy("AGENTS.md", directory);
    copy("project-instructions.md", directory);
    rmSync(join(directory, ".github", "workflows"), { recursive: true, force: true });
  } else {
    for (const path of [...shared, ...toolFiles[tool]]) copy(path, directory);
    mkdirSync(join(directory, ".github", "agents"), { recursive: true });
    for (const file of readdirSync(join(root, ".github", "agents")).filter((name) => name.startsWith("_") && name.endsWith(".md"))) {
      copy(`.github/agents/${file}`, directory);
    }
  }
  stageReleaseRuntime(directory);
  return directory;
}

test("RRM-001: every archive stages and validates the common runtime manifest", () => {
  equal([...release.matchAll(/release-runtime-manifest\.mjs stage "\$STAGING"/g)].length, 6);
  equal([...release.matchAll(/release-runtime-manifest\.mjs validate "\$[A-Z_]+ARCHIVE"/g)].length, 6);
});

test("RRM-002: staged runtime includes legal, user, and executable dependencies", () => {
  const directory = fixture();
  try {
    validateExtractedRelease(directory);
    match(readFileSync(join(directory, "LICENSE"), "utf8"), /MIT License/);
    equal(exists(directory, ".gitignore"), false);
    equal(releaseRuntimeFiles.includes("docs/sddp-prd-user-guide.md"), true);
    equal(releaseRuntimeFiles.includes("docs/sddp-systemdesign-user-guide.md"), true);
    equal(releaseRuntimeFiles.includes("scripts/resolve-feature-dir.mjs"), true);
    equal(releaseRuntimeFiles.includes("scripts/parse-stress-test-findings.mjs"), true);
    equal(releaseRuntimeFiles.includes("scripts/validate-prd.mjs"), true);
    equal(releaseRuntimeFiles.includes("scripts/validate-sad.mjs"), true);
    equal(releaseRuntimeFiles.includes("scripts/lib/feature-directory.mjs"), true);
    equal(releaseRuntimeFiles.includes("scripts/lib/delegated-agents.mjs"), true);
    equal(releaseRuntimeFiles.includes("scripts/lib/qc-bug-tasks.mjs"), true);
    equal(releaseRuntimeFiles.includes("scripts/assert-release-archive-layout.mjs"), true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("RRM-003: missing runtime files, legal notice, and ignore protection fail closed", () => {
  const directory = fixture();
  try {
    rmSync(join(directory, "scripts", "compress-markdown.mjs"));
    writeFileSync(join(directory, "LICENSE"), "not a license\n");
    throws(() => validateExtractedRelease(directory), /missing runtime file: scripts\/compress-markdown\.mjs/);
    throws(() => validateExtractedRelease(directory), /LICENSE does not contain the MIT notice/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("RRM-010: required runtime and wrapper paths must be regular files", () => {
  const directory = toolFixture("opencode");
  const runtimePath = join(directory, "scripts", "compress-markdown.mjs");
  const wrapperPath = join(directory, delegatedAgents[0].hosts.opencode);
  try {
    rmSync(runtimePath);
    mkdirSync(runtimePath);
    rmSync(wrapperPath);
    mkdirSync(wrapperPath);
    throws(() => validateExtractedRelease(directory), /runtime path is not a regular file: scripts\/compress-markdown\.mjs/);
    throws(() => validateExtractedRelease(directory), /OpenCode methodology agent wrapper is not a regular file/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("RRM-011: OpenCode configuration must be present as a regular file", () => {
  const directory = toolFixture("opencode");
  const configPath = join(directory, "opencode.json");
  try {
    rmSync(configPath);
    mkdirSync(configPath);
    throws(() => validateExtractedRelease(directory), /OpenCode root configuration is not a regular file: opencode\.json/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

function exists(directory, path) {
  try { readFileSync(join(directory, path)); return true; } catch { return false; }
}

test("TR-003 resolves static and literal dynamic local closure including nested helpers and cycles", () => {
  const directory = fixture();
  try {
    writeFileSync(join(directory, "scripts", "release-runtime-manifest.mjs"), "import './static.mjs'; await import('./dynamic.mjs');\n");
    writeFileSync(join(directory, "scripts", "static.mjs"), "import './nested.mjs';\n");
    writeFileSync(join(directory, "scripts", "nested.mjs"), "export const nested = true;\n");
    writeFileSync(join(directory, "scripts", "dynamic.mjs"), "import './cycle-a.mjs';\n");
    writeFileSync(join(directory, "scripts", "cycle-a.mjs"), "import './cycle-b.mjs';\n");
    writeFileSync(join(directory, "scripts", "cycle-b.mjs"), "import './cycle-a.mjs';\n");
    validateExtractedRelease(directory);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("TR-004 rejects absent or unimportable local modules", () => {
  const directory = fixture();
  try {
    writeFileSync(join(directory, "scripts", "release-runtime-manifest.mjs"), "import './absent.mjs';\n");
    throws(() => validateExtractedRelease(directory), /missing local module: \.\/absent\.mjs/);
    writeFileSync(join(directory, "scripts", "lib", "absent.mjs"), "throw new Error('broken import');\n");
    writeFileSync(join(directory, "scripts", "release-runtime-manifest.mjs"), "import './lib/absent.mjs';\n");
    throws(() => validateExtractedRelease(directory), /cannot import local module/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("TR-006 preserves consumer ignore bytes and adds one rule", () => {
  for (const original of ["existing\nrule", "", null]) {
    const directory = mkdtempSync(join(tmpdir(), "release-ignore-"));
    try {
      if (original !== null) writeFileSync(join(directory, ".gitignore"), original);
      ensureImplementStateIgnored(directory);
      ensureImplementStateIgnored(directory);
      const result = readFileSync(join(directory, ".gitignore"), "utf8");
      if (original) ok(result.startsWith(original));
      equal(result.split(/\r?\n/).filter((line) => line === ".implement-state").length, 1);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }
});

test("TR-007 leaves read-only ignore files unchanged", () => {
  const directory = mkdtempSync(join(tmpdir(), "release-ignore-readonly-"));
  const ignore = join(directory, ".gitignore");
  try {
    writeFileSync(ignore, "consumer-rule\n");
    // A directory at the target path cannot be appended, independent of root privileges.
    rmSync(ignore);
    mkdirSync(ignore);
    throws(() => ensureImplementStateIgnored(directory), /cannot protect/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("RRM-004: broken packaged local references fail recursively", () => {
  const directory = fixture();
  try {
    writeFileSync(join(directory, ".github", "skills", "markdown-compression", "BROKEN.md"), "Run `scripts/missing-runtime.mjs`.\n");
    throws(() => validateExtractedRelease(directory), /missing local reference: scripts\/missing-runtime\.mjs/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("RRM-005: validation checks the extracted archive, not only source files", () => {
  const directory = fixture();
  const archive = `${directory}.zip`;
  try {
    equal(spawnSync("zip", ["-qr", archive, "."], { cwd: directory }).status, 0);
    validateReleaseArchive(archive);
  } finally {
    rmSync(directory, { recursive: true, force: true });
    rmSync(archive, { force: true });
  }
});

test("RRM-006: every real tool bundle has a complete extracted runtime manifest", () => {
  for (const tool of ["copilot", "antigravity", "windsurf", "opencode", "claude-code", "codex"]) {
    const directory = toolFixture(tool);
    const archive = `${directory}.zip`;
    const driftOutput = `${directory}-drift`;
    try {
      equal(exists(directory, ".github/skills/writing-quality/SKILL.md"), true, `${tool} is missing the writing-quality reference`);
      equal(exists(directory, ".github/sddp/workflows/implement-tasks/WORKFLOW.md"), true, `${tool} is missing canonical workflows`);
      equal(spawnSync("zip", ["-qr", archive, "."], { cwd: directory }).status, 0);
      validateReleaseArchive(archive);
      const drift = spawnSync(process.execPath, [join(directory, "scripts", "drift-report.mjs"), "--host", tool, "--output", driftOutput, "--strict"], { cwd: directory, encoding: "utf8" });
      equal(drift.status, 0, `${tool}: ${drift.stderr || drift.stdout}`);
      equal(JSON.parse(readFileSync(join(driftOutput, "drift-report.json"), "utf8")).options.host, tool);
    } finally {
      rmSync(directory, { recursive: true, force: true });
      rmSync(archive, { force: true });
      rmSync(driftOutput, { recursive: true, force: true });
    }
  }
});

test("RRM-007: applicable host agent inventories validate from the delegated-agent registry", () => {
  const bundles = [
    ["copilot", "copilot"],
    ["claude-code", "claude"],
    ["codex", "codex"],
    ["opencode", "opencode"],
  ];
  for (const [tool, host] of bundles) {
    const directory = toolFixture(tool);
    try {
      for (const agent of delegatedAgents) {
        const wrapperPath = agent.hosts[host];
        if (wrapperPath) equal(exists(directory, wrapperPath), true, `${tool} is missing ${wrapperPath}`);
      }
      if (host === "opencode") {
        for (const coordinator of openCodeCoordinatorAgents) equal(exists(directory, coordinator.path), true, `opencode is missing ${coordinator.path}`);
      }
      validateExtractedRelease(directory);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

test("RRM-008: missing methodology wrappers fail for each applicable host", () => {
  const methodology = delegatedAgents.find((agent) => agent.kind === "methodology");
  const bundles = [
    ["copilot", "copilot", "Copilot"],
    ["claude-code", "claude", "Claude"],
    ["codex", "codex", "Codex"],
    ["opencode", "opencode", "OpenCode"],
  ];
  for (const [tool, host, label] of bundles) {
    const directory = toolFixture(tool);
    try {
      rmSync(join(directory, methodology.hosts[host]));
      throws(
        () => validateExtractedRelease(directory),
        new RegExp(`missing ${label} methodology agent wrapper: ${methodology.hosts[host].replaceAll("/", "\\/").replaceAll(".", "\\.")}`),
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

test("RRM-009: missing registered OpenCode coordinators fail", () => {
  const directory = toolFixture("opencode");
  const coordinator = openCodeCoordinatorAgents[0];
  try {
    rmSync(join(directory, coordinator.path));
    throws(() => validateExtractedRelease(directory), new RegExp(`missing OpenCode coordinator: ${coordinator.path.replaceAll("/", "\\/").replaceAll(".", "\\.")}`));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
