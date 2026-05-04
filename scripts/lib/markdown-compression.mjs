import path from "node:path";

const BLOCKED_PATTERNS = [
  /(^|\/)AGENTS\.md$/i,
  /(^|\/)CLAUDE\.md$/i,
  /(^|\/)GEMINI\.md$/i,
  /(^|\/)project-instructions\.md$/i,
  /(^|\/)\.github\//i,
  /(^|\/)\.agents\//i,
  /(^|\/)\.claude\//i,
  /(^|\/)\.windsurf\//i,
  /(^|\/)\.opencode\//i,
  /(^|\/)\.codex\//i,
  /(^|\/)specs\/(prd|sad|dod|project-plan)\.md$/i,
  /(^|\/)specs\/adrs\/.+\.md$/i,
  /(^|\/)specs\/[^/]+\/(spec|plan|tasks|qc-report|autopilot-log)\.md$/i,
  /(^|\/)specs\/[^/]+\/checklists\/.+\.md$/i,
];

const ALLOWED_PATTERNS = [
  /(^|\/)README\.md$/i,
  /(^|\/)docs\/.+\.md$/i,
  /(^|\/)specs\/[^/]+\/(research|analysis-report|manual-test)\.md$/i,
];

const FILLER_REPLACEMENTS = [
  [/\bit is important to note that\b/gi, ""],
  [/\bplease note that\b/gi, ""],
  [/\bin order to\b/gi, "to"],
  [/\bmake sure to\b/gi, ""],
  [/\bremember to\b/gi, ""],
  [/\byou should\b/gi, ""],
  [/\byou can\b/gi, "can"],
  [/\bit is recommended that\b/gi, "recommend"],
  [/\bfor the purpose of\b/gi, "for"],
  [/\bin the event that\b/gi, "if"],
  [/\bdue to the fact that\b/gi, "because"],
  [/\bat this point in time\b/gi, "now"],
  [/\bhas the ability to\b/gi, "can"],
  [/\ba number of\b/gi, "many"],
  [/\bas well as\b/gi, "and"],
  [/\bcurrently\b/gi, ""],
  [/\bbasically\b/gi, ""],
  [/\bsimply\b/gi, ""],
  [/\breally\b/gi, ""],
  [/\bvery\b/gi, ""],
];

const URL_REGEX = /https?:\/\/[^\s)]+/g;
const INLINE_CODE_REGEX = /`[^`\n]+`/g;
const MARKDOWN_LINK_REGEX = /\[[^\]]+\]\([^\)]+\)/g;
const HEADING_REGEX = /^(#{1,6})\s+.*$/gm;
const TABLE_LINE_REGEX = /^\|.*\|$/gm;
const CHECKBOX_LINE_REGEX = /^(?:\s*(?:[-*+]|\d+\.)\s+\[[ Xx]\].*)$/gm;
const ID_REGEX = /\b(?:FR|TR|OR|RR|SC|CHK|AD|ADR|CAP|DDR|STF)-\d{3,4}\b|\b(?:T\d{3}|US\d+|OBJ\d+|E\d{3})\b/g;

export function getCompressionPolicy(targetPath) {
  const normalized = normalizePath(targetPath);

  if (!normalized.toLowerCase().endsWith(".md")) {
    return { allowed: false, reason: "Only Markdown files are supported." };
  }

  if (matchesAny(BLOCKED_PATTERNS, normalized)) {
    return { allowed: false, reason: "Parser-sensitive or workflow-owned Markdown is blocked from compression." };
  }

  if (!matchesAny(ALLOWED_PATTERNS, normalized)) {
    return { allowed: false, reason: "File is outside the narrative-markdown allowlist." };
  }

  return { allowed: true, reason: "Safe narrative-markdown target." };
}

export function compressMarkdown(markdown) {
  const lines = markdown.split("\n");
  const result = [];
  let inFrontmatter = false;
  let frontmatterSeen = false;
  let inFence = false;
  let fenceDelimiter = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (index === 0 && line.trim() === "---") {
      inFrontmatter = true;
      frontmatterSeen = true;
      result.push(line);
      continue;
    }

    if (inFrontmatter) {
      result.push(line);
      if (line.trim() === "---") {
        inFrontmatter = false;
      }
      continue;
    }

    const fenceMatch = line.match(/^(\s{0,3})(`{3,}|~{3,})/);
    if (fenceMatch) {
      const delimiter = fenceMatch[2][0];
      if (!inFence) {
        inFence = true;
        fenceDelimiter = delimiter;
      } else if (delimiter === fenceDelimiter) {
        inFence = false;
        fenceDelimiter = null;
      }
      result.push(line);
      continue;
    }

    if (inFence || shouldPreserveLine(line, frontmatterSeen)) {
      result.push(line);
      continue;
    }

    result.push(compressLine(line));
  }

  return result.join("\n");
}

export function validateCompressedMarkdown({ original, compressed, targetPath }) {
  const errors = [];
  const policy = getCompressionPolicy(targetPath);

  if (!policy.allowed) {
    errors.push(policy.reason);
    return { ok: false, errors };
  }

  compareExactSequence(errors, "headings", extractMatches(original, HEADING_REGEX), extractMatches(compressed, HEADING_REGEX));
  compareExactSequence(errors, "fenced code blocks", extractFencedBlocks(original), extractFencedBlocks(compressed));
  compareExactSequence(errors, "inline code spans", extractMatches(original, INLINE_CODE_REGEX), extractMatches(compressed, INLINE_CODE_REGEX));
  compareExactSequence(errors, "URLs", extractMatches(original, URL_REGEX), extractMatches(compressed, URL_REGEX));
  compareExactSequence(errors, "Markdown links", extractMatches(original, MARKDOWN_LINK_REGEX), extractMatches(compressed, MARKDOWN_LINK_REGEX));
  compareExactSequence(errors, "identifier tokens", extractMatches(original, ID_REGEX), extractMatches(compressed, ID_REGEX));
  compareExactSequence(errors, "table lines", extractMatches(original, TABLE_LINE_REGEX), extractMatches(compressed, TABLE_LINE_REGEX));
  compareExactSequence(errors, "checkbox lines", extractMatches(original, CHECKBOX_LINE_REGEX), extractMatches(compressed, CHECKBOX_LINE_REGEX));

  return { ok: errors.length === 0, errors };
}

export function getBackupPath(targetPath) {
  const parsed = path.parse(targetPath);
  return path.join(parsed.dir, `${parsed.name}.original${parsed.ext}`);
}

export function summarizeCompression(original, compressed) {
  const before = original.length;
  const after = compressed.length;
  const delta = before - after;
  const percent = before === 0 ? 0 : Math.round((delta / before) * 100);

  return { before, after, delta, percent };
}

function compressLine(line) {
  const prefixMatch = line.match(/^(\s*(?:>\s*)?(?:(?:[-*+])\s+|\d+\.\s+)?)?(.*)$/);
  const prefix = prefixMatch?.[1] ?? "";
  const content = prefixMatch?.[2] ?? line;
  const { text, placeholders } = protectInlineCode(content);
  const compressed = restoreInlineCode(compactText(text), placeholders);

  if (compressed.length === 0 && content.trim().length > 0) {
    return line;
  }

  return `${prefix}${compressed}`.replace(/\s+$/g, "");
}

function compactText(text) {
  let result = text;

  for (const [pattern, replacement] of FILLER_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  result = result
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/^[,;:\s]+/g, "")
    .trim();

  return result;
}

function shouldPreserveLine(line, frontmatterSeen) {
  if (line.trim() === "") {
    return true;
  }

  if (!frontmatterSeen && line.trim() === "---") {
    return true;
  }

  return (
    /^#{1,6}\s+/.test(line)
    || /^\|.*\|$/.test(line)
    || /^(?:\s*(?:[-*+]|\d+\.)\s+\[[ Xx]\].*)$/.test(line)
    || /^\s{4,}/.test(line)
    || /^\t/.test(line)
    || /^<!--/.test(line)
    || /\[[^\]]+\]\([^\)]+\)/.test(line)
    || /https?:\/\/[^\s)]+/.test(line)
  );
}

function protectInlineCode(text) {
  const placeholders = [];
  const protectedText = text.replace(INLINE_CODE_REGEX, (match) => {
    const token = `__INLINE_CODE_${placeholders.length}__`;
    placeholders.push({ token, value: match });
    return token;
  });

  return { text: protectedText, placeholders };
}

function restoreInlineCode(text, placeholders) {
  return placeholders.reduce((current, placeholder) => current.replaceAll(placeholder.token, placeholder.value), text);
}

function extractMatches(text, regex) {
  return Array.from(text.matchAll(cloneRegex(regex)), (match) => match[0]);
}

function extractFencedBlocks(text) {
  const lines = text.split("\n");
  const blocks = [];
  let inFence = false;
  let current = [];
  let fenceDelimiter = null;

  for (const line of lines) {
    const fenceMatch = line.match(/^(\s{0,3})(`{3,}|~{3,})/);
    if (!inFence && fenceMatch) {
      inFence = true;
      fenceDelimiter = fenceMatch[2][0];
      current = [line];
      continue;
    }

    if (inFence) {
      current.push(line);
      if (fenceMatch && fenceMatch[2][0] === fenceDelimiter) {
        blocks.push(current.join("\n"));
        current = [];
        inFence = false;
        fenceDelimiter = null;
      }
    }
  }

  if (current.length > 0) {
    blocks.push(current.join("\n"));
  }

  return blocks;
}

function compareExactSequence(errors, label, original, compressed) {
  if (original.length !== compressed.length) {
    errors.push(`${label}: count changed (${original.length} -> ${compressed.length})`);
    return;
  }

  for (let index = 0; index < original.length; index += 1) {
    if (original[index] !== compressed[index]) {
      errors.push(`${label}: item ${index + 1} changed`);
      return;
    }
  }
}

function normalizePath(targetPath) {
  return String(targetPath).split(path.sep).join("/");
}

function matchesAny(patterns, targetPath) {
  return patterns.some((pattern) => pattern.test(targetPath));
}

function cloneRegex(regex) {
  return new RegExp(regex.source, regex.flags);
}