#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { deriveCompletionState } from "./derive-completion-state.mjs";
import { metadata, readOptional } from "./lib/bootstrap-documents.mjs";
import { recordEpicCompletion } from "./lib/onboarding.mjs";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [plan, featureDir, epic, ...extra] = process.argv.slice(2);
    if (!plan || !featureDir || !epic || extra.length) throw new Error("Usage: node scripts/record-epic-completion.mjs <plan> <feature-dir> <epic-id>");
    const root = process.cwd();
    const result = recordEpicCompletion(root, plan, featureDir, epic, () => {
      if (metadata(readOptional(root, `${featureDir}/spec.md`) ?? "").epic_id !== epic) throw new Error("Feature specification does not identify the selected epic");
      return deriveCompletionState(featureDir, root);
    });
    console.log(JSON.stringify(result));
  } catch (error) { console.log(JSON.stringify({ valid: false, errors: [error.message] })); process.exitCode = 1; }
}
