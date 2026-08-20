import { test } from "node:test";
import { doesNotMatch, match, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repoPath = (relativePath) => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
const read = (relativePath) => readFileSync(repoPath(relativePath), "utf8");

const wrappers = [
  ".github/prompts/sddp-prd.prompt.md",
  ".claude/skills/sddp-prd/SKILL.md",
  ".agents/skills/sddp-prd/SKILL.md",
  ".agents/workflows/sddp-prd.md",
  ".opencode/commands/sddp-prd.md",
  ".opencode/agents/sddp-product-strategist.md",
  ".windsurf/workflows/sddp-prd.md",
];

test("PRD-001: every client wrapper loads the shared workflow and passes the full control set", () => {
  for (const wrapperPath of wrappers) {
    const wrapper = read(wrapperPath);
    match(wrapper, /\$ARGUMENTS/, `${wrapperPath} must pass command input`);
    match(wrapper, /\.github\/skills\/product-document\/SKILL\.md/, `${wrapperPath} must load the shared workflow`);
    match(wrapper, /no mode flag[^\n]*defaults? to `--quick`/i, `${wrapperPath} must default to quick mode`);
    for (const control of ["--quick", "--discover", "--resume", "--skip-research"]) {
      ok(wrapper.includes(`\`${control}\``), `${wrapperPath} must mention ${control}`);
    }
  }
});

test("PRD-002: every client wrapper waits for explicit complete answers", () => {
  for (const wrapperPath of wrappers) {
    const wrapper = read(wrapperPath);
    match(wrapper, /ask[^\n]*explicitly[^\n]*wait/i, `${wrapperPath} must ask explicitly and wait`);
    match(wrapper, /(?:recommendation|recommended option)[^\n]*guidance only/i, `${wrapperPath} must not auto-select recommendations`);
    match(wrapper, /(?:do not|never)[^\n]*infer[^\n]*silence[^\n]*partial (?:response|output)/i, `${wrapperPath} must reject silence and partial responses`);
    match(wrapper, /free-form answers?[^\n]*workflow (?:allows|permits)/i, `${wrapperPath} must preserve free-form input`);
  }
});

test("PRD-003: wrappers preserve their client-specific Technical Researcher delegation", () => {
  const combined = wrappers.map((wrapperPath) => read(wrapperPath)).join("\n");
  doesNotMatch(combined, /\*\*Delegate: (?!Technical Researcher\b)[^*]+\*\*/, "only Technical Researcher may be a named external delegate");

  match(read(".claude/skills/sddp-prd/SKILL.md"), /Technical Researcher[^\n]*sddp-technical-researcher[^\n]*Task/);
  match(read(".opencode/commands/sddp-prd.md"), /invoke `sddp-technical-researcher`/);
  match(read(".opencode/agents/sddp-product-strategist.md"), /Technical Researcher[^\n]*`sddp-technical-researcher`/);

  for (const wrapperPath of [
    ".github/prompts/sddp-prd.prompt.md",
    ".agents/skills/sddp-prd/SKILL.md",
    ".agents/workflows/sddp-prd.md",
    ".windsurf/workflows/sddp-prd.md",
  ]) {
    match(read(wrapperPath), /Technical Researcher[^\n]*\.github\/agents\/_technical-researcher\.md/);
  }
});

test("PRD-004: wrappers report milestone progress", () => {
  for (const wrapperPath of wrappers) {
    match(read(wrapperPath), /Report[^\n]*milestone progress/i, `${wrapperPath} must report milestone progress`);
  }
});

test("PRD-005: Claude can execute the shared PRD validator", () => {
  match(read(".claude/skills/sddp-prd/SKILL.md"), /allowed-tools:[^\n]*\bBash\b/);
});

test("PRD-006: quick mode cannot overwrite active durable discovery", () => {
  const workflow = read(".github/skills/product-document/SKILL.md");
  match(workflow, /status is `active` or `ready-to-synthesize`, QUICK must \*\*HALT\*\*/);
  match(workflow, /repository-relative[\s\S]*symlink-free before any read or write/);
});
