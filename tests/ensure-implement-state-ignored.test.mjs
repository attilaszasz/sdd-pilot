import { test } from "node:test";
import { equal, match } from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { ensureImplementStateIgnored } from "../scripts/ensure-implement-state-ignored.mjs";

const helper = fileURLToPath(new URL("../scripts/ensure-implement-state-ignored.mjs", import.meta.url));

function fixture() {
  return mkdtempSync(join(tmpdir(), "implement-state-ignore-"));
}

test("ISI-001: preserves existing ignore bytes and adds the rule once", () => {
  const cases = [
    ["consumer-rule\ncustom/path", "consumer-rule\ncustom/path\n.implement-state\n"],
    ["consumer-rule\n", "consumer-rule\n.implement-state\n"],
    ["", ".implement-state\n"],
    [null, ".implement-state\n"],
    [".implement-state\nconsumer-rule\n", ".implement-state\nconsumer-rule\n"],
  ];
  for (const [original, expected] of cases) {
    const directory = fixture();
    try {
      if (original !== null) writeFileSync(join(directory, ".gitignore"), original);
      ensureImplementStateIgnored(directory);
      ensureImplementStateIgnored(directory);
      equal(readFileSync(join(directory, ".gitignore"), "utf8"), expected);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }
});

test("ISI-002: focused CLI updates a consumer project and rejects invalid arguments", () => {
  const directory = fixture();
  try {
    const success = spawnSync(process.execPath, [helper, directory], { encoding: "utf8" });
    equal(success.status, 0, success.stderr);
    equal(readFileSync(join(directory, ".gitignore"), "utf8"), ".implement-state\n");
    const invalid = spawnSync(process.execPath, [helper], { encoding: "utf8" });
    equal(invalid.status, 1);
    match(invalid.stderr, /Usage: ensure-implement-state-ignored\.mjs DIRECTORY/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("ISI-003: an unwritable ignore target is unchanged and fails closed", () => {
  const directory = fixture();
  const ignore = join(directory, ".gitignore");
  try {
    mkdirSync(ignore);
    writeFileSync(join(ignore, "preserved"), "consumer-rule\n");
    const result = spawnSync(process.execPath, [helper, directory], { encoding: "utf8" });
    equal(result.status, 1);
    match(result.stderr, /cannot protect \.implement-state/);
    equal(readFileSync(join(ignore, "preserved"), "utf8"), "consumer-rule\n");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
