import { test } from "node:test";
import { equal, match, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { findWritingQualityContractDrift } from "../scripts/drift-report.mjs";

const read = (relativePath) => readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
const primer = read("../AGENTS.md");
const reference = read("../.github/skills/writing-quality/SKILL.md");
const driftReport = read("../scripts/drift-report.mjs");

test("WQH-001: current writing-quality contract retains its semantic safeguards", () => {
  const findings = findWritingQualityContractDrift({ primer, reference });

  equal(findings.length, 0, findings.map((finding) => finding.detail).join("\n"));
  match(primer, /`project-instructions\.md` remains authoritative/);
  match(reference, /Never run a whole-file style rewrite over SDDP artifacts or governance files/);
});

test("WQH-002: missing ambient and expanded safeguards fail closed", () => {
  const findings = findWritingQualityContractDrift({
    primer: primer.replace("Preserve meaning, scope, certainty, evidence, citations, and the user's voice.", "Preserve meaning."),
    reference: reference.replace("Style work never authorizes a new requirement, stronger claim, resolved ambiguity, changed priority, or removed caveat.", "Style work is safe."),
  });

  ok(findings.some((finding) => finding.filePath === "AGENTS.md" && finding.label === "meaning preservation"));
  ok(findings.some((finding) => finding.filePath === ".github/skills/writing-quality/SKILL.md" && finding.label === "no semantic authorization"));
});

test("WQH-003: runtime files may not reload the ambient writing-quality skill", () => {
  const findings = findWritingQualityContractDrift({
    primer,
    reference,
    documents: [{
      filePath: ".github/skills/example/SKILL.md",
      content: "Read `.github/skills/writing-quality/SKILL.md` before writing.\n",
    }],
  });

  equal(findings.length, 1);
  equal(findings[0].filePath, ".github/skills/example/SKILL.md");
  match(findings[0].detail, /runtime rules are ambient/);
});

test("WQH-004: strict drift reporting includes writing-quality enforcement", () => {
  match(driftReport, /checkWritingQualityHoist/);
  match(driftReport, /Writing Quality Hoist/);
  match(driftReport, /runtime files do not load/);
});
