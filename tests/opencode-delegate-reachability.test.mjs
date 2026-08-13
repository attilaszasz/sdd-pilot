import { test } from "node:test";
import { deepEqual, ok } from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateOpenCodeDelegateGraph } from "../scripts/lib/opencode-delegate-graph.mjs";
import { publicCommands } from "../scripts/lib/public-commands.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "opencode-delegates-"));
  for (const relative of [".github/skills", ".opencode/commands", ".opencode/agents", "opencode.json"]) {
    cpSync(join(repoRoot, relative), join(root, relative), { recursive: true });
  }
  return root;
}

function edit(root, relativePath, mutate) {
  const filePath = join(root, relativePath);
  writeFileSync(filePath, mutate(readFileSync(filePath, "utf8")));
}

test("ODR-001: all public OpenCode commands reach their canonical transitive delegates", async () => {
  const result = await validateOpenCodeDelegateGraph(repoRoot, publicCommands);
  deepEqual(result.findings, []);
  deepEqual(result.rows.map((row) => row.command), publicCommands.map((command) => command.command));
});

test("ODR-002: missing mappings, retargeted commands, denied tasks, extras, duplicates, and comments fail closed", async () => {
  const cases = [
    ["missing", ".opencode/commands/sddp-implement.md", (content) => content.replace("- **Delegate: Spec Validator** → invoke `sddp-spec-validator`\n", ""), /Missing delegate mappings: sddp-spec-validator/],
    ["comment", ".opencode/commands/sddp-implement.md", (content) => content.replace("- **Delegate: Spec Validator** → invoke `sddp-spec-validator`\n", "<!-- invoke `sddp-spec-validator` -->\n"), /Missing delegate mappings: sddp-spec-validator/],
    ["retargeted", ".opencode/commands/sddp-implement.md", (content) => content.replace("agent: build", "agent: sddp-developer"), /Selected agent sddp-developer cannot reach delegates/],
    ["denied", "opencode.json", (content) => content.replace('"sddp-spec-validator": "allow"', '"sddp-spec-validator": "deny"'), /Selected agent build cannot reach delegates: sddp-spec-validator/],
    ["extra", ".opencode/commands/sddp-plan.md", (content) => `${content}\n<!-- invoke \`sddp-developer\` -->\ninvoke \`sddp-developer\`\n`, /Unexpected delegate mappings: sddp-developer/],
    ["duplicate", ".opencode/commands/sddp-plan.md", (content) => `${content}\ninvoke \`sddp-adr-author\`\n`, /Duplicate delegate mappings: sddp-adr-author/],
  ];
  for (const [name, relativePath, mutate, expected] of cases) {
    const root = fixture();
    try {
      edit(root, relativePath, mutate);
      const result = await validateOpenCodeDelegateGraph(root, publicCommands);
      ok(result.findings.some((finding) => expected.test(finding.detail)), name);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
