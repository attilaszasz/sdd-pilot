import { test } from "node:test";
import { match, ok, strictEqual } from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { publicCommands } from "../scripts/lib/public-commands.mjs";

const repoPath = (relativePath) => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
const read = (relativePath) => readFileSync(repoPath(relativePath), "utf8");

const interactiveCommands = new Set([
  "sddp-amend",
  "sddp-checklist",
  "sddp-clarify",
  "sddp-devops",
  "sddp-implement",
  "sddp-implement-qc-loop",
  "sddp-init",
  "sddp-plan",
  "sddp-prd",
  "sddp-qc",
  "sddp-regen",
  "sddp-specify",
  "sddp-systemdesign",
]);

test("CWC-001: every public command has one directly editable Codex wrapper", () => {
  strictEqual(publicCommands.length, 18);

  for (const command of publicCommands) {
    const relativePath = `.agents/skills/${command.command}/SKILL.md`;
    ok(existsSync(repoPath(relativePath)), `missing ${relativePath}`);

    const wrapper = read(relativePath);
    match(wrapper, new RegExp(`^name: ${command.command}$`, "m"));
    match(wrapper, new RegExp(`\\.github/skills/${command.skill}/SKILL\\.md`));
    match(wrapper, /Report[^\n]*progress/i);
  }
});

test("CWC-002: Codex wrappers preserve interaction and host-specific behavior", () => {
  for (const command of publicCommands) {
    const wrapper = read(`.agents/skills/${command.command}/SKILL.md`);
    if (interactiveCommands.has(command.command)) {
      match(wrapper, /Ask the user explicitly in chat and wait for the reply/);
      match(wrapper, /do not choose it on the user's behalf/i);
    }
  }

  match(read(".agents/skills/sddp-autopilot/SKILL.md"), /real unattended execution/);
  match(read(".agents/skills/sddp-autopilot/SKILL.md"), /never prompt the user/);
  match(read(".agents/skills/sddp-devsetup/SKILL.md"), /installation, mutation, or destructive commands require explicit user confirmation/);
  match(read(".agents/skills/sddp-qc/SKILL.md"), /does not declare a native browser tool/);
});

test("CWC-003: Codex delegation follows canonical paths without duplicate inventories", () => {
  for (const command of publicCommands) {
    const wrapper = read(`.agents/skills/${command.command}/SKILL.md`);
    ok(!/^- \*\*Delegate:/m.test(wrapper), `${command.command} duplicates the canonical delegate inventory`);

    const canonical = read(`.github/skills/${command.skill}/SKILL.md`);
    for (const match of canonical.matchAll(/`(\.github\/agents\/_?[a-z0-9-]+\.md)`/g)) {
      ok(existsSync(repoPath(match[1])), `${command.skill} references missing ${match[1]}`);
    }
  }

  const driftReport = read("scripts/drift-report.mjs");
  match(driftReport, /const expectedDelegates = extractCanonicalDelegateIds\(canonicalContent\)/);
  ok(!/baselineDocument\.exists\s*\?\s*baselineDocument\.delegates/.test(driftReport));
});
