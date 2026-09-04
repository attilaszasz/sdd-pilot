#!/usr/bin/env node

export const minimumNodeMajor = 22;
export const prerequisitesUrl = "https://github.com/attilaszasz/sdd-pilot#prerequisites";

export function evaluateRuntime(version) {
  const detected = typeof version === "string" ? version.replace(/^v/, "") : "not found";
  const major = /^\d+$/.test(detected.split(".", 1)[0]) ? Number(detected.split(".", 1)[0]) : 0;
  const ok = major >= minimumNodeMajor;
  return {
    ok,
    minimumNodeMajor,
    detected,
    ...(ok ? {} : {
      message: `SDD Pilot requires Node.js ${minimumNodeMajor} or newer available as node. Detected: ${detected}. Install a supported Node.js LTS release: ${prerequisitesUrl}. No SDD Pilot artifact was modified.`,
    }),
  };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  const result = evaluateRuntime(process.versions.node);
  console.log(JSON.stringify(result));
  if (!result.ok) process.exitCode = 1;
}
