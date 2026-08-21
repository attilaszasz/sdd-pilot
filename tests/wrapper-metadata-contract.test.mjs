import { test } from "node:test";
import { deepEqual, equal, ok, throws } from "node:assert/strict";

import { publicCommands } from "../scripts/lib/public-commands.mjs";
import { commandSurfaces, expectedCommandBodyMetadata, expectedCommandFrontmatter } from "../scripts/lib/wrapper-inventory.mjs";

test("WMC-001: every command surface declares its native frontmatter and invocation contracts", () => {
  deepEqual(commandSurfaces.map(({ key, frontmatter, invocation, description, argumentHint }) => [key, frontmatter, invocation, description, argumentHint]), [
    ["copilot", "prompt", "user-command-surface", "body", "body"],
    ["claude", "skill", "native-disable-model-invocation", "frontmatter", "frontmatter"],
    ["codex", "skill", "description-guard", "frontmatter", "body"],
    ["antigravity", "workflow", "user-workflow-surface", "frontmatter", "body"],
    ["opencode", "command", "native-command", "frontmatter", "body"],
    ["windsurf", null, "user-workflow-surface", "body", "body"],
  ]);
});

test("WMC-002: native wrapper metadata is derived only from public command metadata", () => {
  for (const command of publicCommands) {
    deepEqual(expectedCommandFrontmatter("copilot", command), { agent: command.hostRoles.copilot });
    deepEqual(expectedCommandFrontmatter("claude", command), {
      name: command.command,
      description: command.description,
      "argument-hint": command.arguments.hint,
      "disable-model-invocation": true,
    });
    deepEqual(expectedCommandFrontmatter("codex", command), {
      name: command.command,
      description: `${command.description} Direct command-bar dispatch only; do not select for general queries.`,
    });
    deepEqual(expectedCommandFrontmatter("antigravity", command), { description: command.description });
    deepEqual(expectedCommandFrontmatter("opencode", command), {
      description: command.description,
      agent: command.hostRoles.opencode,
      subtask: false,
    });
    equal(expectedCommandFrontmatter("windsurf", command), null);
  }
});

test("WMC-003: derived metadata is immutable and unknown surfaces fail closed", () => {
  for (const surface of commandSurfaces) {
    const expected = expectedCommandFrontmatter(surface.key, publicCommands[0]);
    if (expected) ok(Object.isFrozen(expected));
  }
  throws(() => expectedCommandFrontmatter("unknown", publicCommands[0]), /Unknown command surface/);
  throws(() => expectedCommandBodyMetadata("unknown", publicCommands[0]), /Unknown command surface/);
});

test("WMC-004: hosts without native fields receive exact body metadata fallbacks", () => {
  const command = publicCommands[0];
  deepEqual(expectedCommandBodyMetadata("copilot", command), [
    `Command description: ${command.description}`,
    `Argument hint: \`${command.arguments.hint}\``,
    `Command category: \`${command.category}\``,
    "Prerequisites: none",
  ]);
  deepEqual(expectedCommandBodyMetadata("claude", command), [
    `Command category: \`${command.category}\``,
    "Prerequisites: none",
  ]);
  for (const surface of ["codex", "antigravity", "opencode"]) {
    deepEqual(expectedCommandBodyMetadata(surface, command), [
      `Argument hint: \`${command.arguments.hint}\``,
      `Command category: \`${command.category}\``,
      "Prerequisites: none",
    ]);
  }
  deepEqual(expectedCommandBodyMetadata("windsurf", command), [
    `Command description: ${command.description}`,
    `Argument hint: \`${command.arguments.hint}\``,
    `Command category: \`${command.category}\``,
    "Prerequisites: none",
  ]);
});

test("WMC-005: prerequisite reporting preserves metadata order and explicit empty state", () => {
  const projectPlan = publicCommands.find((command) => command.command === "sddp-projectplan");
  for (const surface of commandSurfaces) {
    deepEqual(expectedCommandBodyMetadata(surface.key, projectPlan).slice(-2), [
      "Command category: `project-bootstrap`",
      "Prerequisites: `product-document:planning-ready`, `technical-context:planning-ready`",
    ]);
  }
});
