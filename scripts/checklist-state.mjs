import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const queueEntry = /^- \[([ X])\] (CHL\d{3}) (.+\S)$/;
const checklistItem = /^- \[([ xX])\] (CHK\d{3})\b/;

export function assessChecklistState(featureDirectory) {
  const directory = path.join(featureDirectory, "checklists");
  if (!existsSync(directory)) {
    return { overallStatus: "N/A", blocking: false, queue: null, files: [], issues: [] };
  }

  const names = readdirSync(directory).sort();
  const files = names.filter((name) => name.endsWith(".md")).map((name) => {
    const lines = readFileSync(path.join(directory, name), "utf8").split(/\r?\n/);
    const items = lines.map((line) => line.match(checklistItem)).filter(Boolean);
    const incomplete = items.filter(([, state]) => state === " ").length;
    return {
      name,
      path: path.join(directory, name),
      total: items.length,
      completed: items.length - incomplete,
      incomplete,
      status: items.length === 0 ? "EMPTY" : incomplete > 0 ? "FAIL" : "PASS",
    };
  });

  const issues = [];
  const queuePath = path.join(directory, ".checklists");
  let queue = null;
  if (existsSync(queuePath)) {
    const entries = [];
    for (const [index, line] of readFileSync(queuePath, "utf8").split(/\r?\n/).entries()) {
      if (!line || line.startsWith("#") || line.startsWith(">")) continue;
      const match = line.match(queueEntry);
      if (!match) {
        issues.push(`malformed checklist queue line ${index + 1}`);
        continue;
      }
      entries.push({ id: match[2], completed: match[1] === "X" });
    }
    const ids = new Set();
    for (const entry of entries) {
      if (ids.has(entry.id)) issues.push(`duplicate checklist queue ID ${entry.id}`);
      ids.add(entry.id);
      const matchingFiles = files.filter(({ name }) => name.startsWith(`${entry.id}-`));
      if (entry.completed && matchingFiles.length !== 1) issues.push(`completed queue entry ${entry.id} does not have exactly one checklist file`);
      if (!entry.completed && matchingFiles.length > 1) issues.push(`pending queue entry ${entry.id} has multiple checklist files`);
    }
    for (const { name } of files) {
      const id = name.match(/^(CHL\d{3})-/)?.[1];
      if (id && !ids.has(id)) issues.push(`checklist file ${name} has no queue entry`);
    }
    const remaining = entries.filter((entry) => !entry.completed).length;
    queue = { total: entries.length, completed: entries.length - remaining, remaining, status: issues.length > 0 ? "MALFORMED" : remaining === 0 ? "COMPLETE" : "PENDING" };
  }

  const totalItems = files.reduce((total, file) => total + file.total, 0);
  const totalIncomplete = files.reduce((total, file) => total + file.incomplete, 0);
  if (files.length === 0) issues.push("checklists directory has no checklist files");
  if (files.some((file) => file.status === "EMPTY")) issues.push("checklist file is empty");
  if (files.some((file) => file.status === "FAIL")) issues.push("checklist item is incomplete");
  if (queue?.status === "PENDING") issues.push("checklist queue is incomplete");

  return {
    overallStatus: issues.length === 0 ? "PASS" : "FAIL",
    blocking: issues.length > 0,
    queue,
    files,
    totalFiles: files.length,
    totalItems,
    totalIncomplete,
    issues: [...new Set(issues)],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const featureDirectory = process.argv[2];
  if (!featureDirectory) throw new Error("Usage: node scripts/checklist-state.mjs <feature-dir>");
  console.log(JSON.stringify(assessChecklistState(featureDirectory), null, 2));
}
