import path from "node:path";
import { fileURLToPath } from "node:url";

export const GOVERNANCE_COMPRESSION_TARGETS = Object.freeze([
  ".github/skills/implement-tasks/SKILL.md",
]);

const GOVERNANCE_TARGET_SET = new Set(GOVERNANCE_COMPRESSION_TARGETS);
export const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const PARSER_SENSITIVE_PATTERNS = [
  /(^|\/)AGENTS\.md$/i,
  /(^|\/)CLAUDE\.md$/i,
  /(^|\/)project-instructions\.md$/i,
  /(^|\/)specs\/(prd|sad|dod|project-plan)\.md$/i,
  /(^|\/)specs\/adrs\/.+\.md$/i,
  /(^|\/)specs\/plan\/.+\.md$/i,
  /(^|\/)specs\/[^/]+\/(spec|plan|tasks|qc-report|autopilot-log)\.md$/i,
  /(^|\/)specs\/[^/]+\/checklists\/.+\.md$/i,
];

const WORKFLOW_BLOCKED_PATTERNS = [
  /(^|\/)\.github\//i,
  /(^|\/)\.agents\//i,
  /(^|\/)\.claude\//i,
  /(^|\/)\.windsurf\//i,
  /(^|\/)\.opencode\//i,
  /(^|\/)\.codex\//i,
];

const ALLOWED_PATTERNS = [
  /(^|\/)README\.md$/i,
  /(^|\/)docs\/.+\.md$/i,
  /(^|\/)specs\/[^/]+\/(research|analysis-report|manual-test)\.md$/i,
];

const URL_REGEX = /https?:\/\/[^\s)]+/g;
const INLINE_CODE_REGEX = /`[^`\n]+`/g;
const MARKDOWN_LINK_REGEX = /\[[^\]]+\]\([^\)]+\)/g;
const HEADING_REGEX = /^(#{1,6})\s+.*$/gm;
const TABLE_LINE_REGEX = /^.*\|.*$/gm;
const CHECKBOX_LINE_REGEX = /^(?:\s*(?:>\s*)*(?:[-*+]|\d+[.)])\s+\[[ Xx]\].*)$/gm;
const ID_REGEX = /\b(?:FR|TR|OR|RR|SC|CHK|AD|ADR|CAP|DDR|STF)-\d{3,4}\b|\b(?:T\d{3}|US\d+|OBJ\d+|E\d{3})\b/g;
const LIST_PREFIX_REGEX = /^\s*(?:>\s*)*(?:[-*+]\s+|\d+[.)]\s+)/;
const BLOCKQUOTE_PREFIX_REGEX = /^\s*(?:>\s*)+/;
const NARRATIVE_TAG_LINE_REGEX = /^\s*<\/?(?:rules|workflow)>\s*$/;
const TABLE_DELIMITER_REGEX = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const HTML_BLOCK_OPEN_REGEX = /^\s{0,3}<(address|article|aside|base|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:\s|\/?>)/i;
const HTML_LINE_REGEX = /^\s{0,3}(?:<\/?[A-Za-z][^>]*>|<![A-Z]|<\?)/;
const VOID_HTML_TAGS = new Set(["base", "col", "hr", "iframe", "link", "param", "track"]);

export function getCompressionPolicy(targetPath) {
  if (getRepositoryRelativePath(targetPath) === null) {
    return { allowed: false, reason: "Target must be a file inside the repository." };
  }

  const normalized = normalizePath(targetPath);

  if (!normalized.toLowerCase().endsWith(".md")) {
    return { allowed: false, reason: "Only Markdown files are supported." };
  }

  if (matchesAny(PARSER_SENSITIVE_PATTERNS, normalized)) {
    return { allowed: false, reason: "Parser-sensitive or workflow-owned Markdown is blocked from compression." };
  }

  if (isGovernanceTarget(targetPath)) {
    return { allowed: true, mode: "narrative-only", reason: "Reviewed governance prose target." };
  }

  if (matchesAny(WORKFLOW_BLOCKED_PATTERNS, normalized)) {
    return { allowed: false, reason: "Parser-sensitive or workflow-owned Markdown is blocked from compression." };
  }

  if (!matchesAny(ALLOWED_PATTERNS, normalized)) {
    return { allowed: false, reason: "File is outside the narrative-markdown allowlist." };
  }

  return { allowed: true, reason: "Safe narrative-markdown target." };
}

export function compressMarkdown(markdown, { narrativeOnly = false, mode } = {}) {
  const useNarrativeOnly = narrativeOnly || mode === "narrative-only";
  const { lines, endings } = splitLines(markdown);
  const result = [];
  const tableLines = getTableLineIndexes(lines);
  let inFrontmatter = false;
  let frontmatterSeen = false;
  let inFence = false;
  let fence = null;
  let narrativeBlockDepth = 0;
  let inHtmlComment = false;
  let htmlBlockTag = null;

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

    const fenceTransition = advanceFence(line, fence);
    if (fenceTransition.matched) {
      fence = fenceTransition.fence;
      inFence = fence !== null;
      result.push(line);
      continue;
    }

    if (inFence) {
      result.push(line);
      continue;
    }

    if (isNarrativeTagLine(line)) {
      result.push(line);
      narrativeBlockDepth = updateNarrativeBlockDepth(line, narrativeBlockDepth);
      continue;
    }

    if (inHtmlComment || line.includes("<!--")) {
      result.push(line);
      if (line.includes("<!--") && !line.includes("-->")) {
        inHtmlComment = true;
      } else if (line.includes("-->")) {
        inHtmlComment = false;
      }
      continue;
    }

    if (htmlBlockTag !== null) {
      result.push(line);
      if (new RegExp(`</${htmlBlockTag}\\s*>`, "i").test(line)) {
        htmlBlockTag = null;
      }
      continue;
    }

    const htmlBlockMatch = line.match(HTML_BLOCK_OPEN_REGEX);
    if (htmlBlockMatch) {
      result.push(line);
      if (!VOID_HTML_TAGS.has(htmlBlockMatch[1].toLowerCase()) && !line.includes("/>") && !new RegExp(`</${htmlBlockMatch[1]}\\s*>`, "i").test(line)) {
        htmlBlockTag = htmlBlockMatch[1];
      }
      continue;
    }

    if ((useNarrativeOnly && narrativeBlockDepth === 0) || tableLines.has(index) || shouldPreserveLine(line, frontmatterSeen)) {
      result.push(line);
      continue;
    }

    result.push(compressLine(line));
  }

  return result.map((line, index) => line + endings[index]).join("");
}

export function validateCompressedMarkdown({ original, compressed, targetPath, mode }) {
  const errors = [];
  const policy = getCompressionPolicy(targetPath);
  const compressionMode = policy.mode ?? mode;

  if (!policy.allowed) {
    errors.push(policy.reason);
    return { ok: false, errors };
  }

  compareExactSequence(errors, "frontmatter blocks", extractFrontmatterBlocks(original), extractFrontmatterBlocks(compressed));
  compareExactSequence(errors, "headings", extractMatches(original, HEADING_REGEX), extractMatches(compressed, HEADING_REGEX));
  compareExactSequence(errors, "fenced code blocks", extractFencedBlocks(original), extractFencedBlocks(compressed));
  compareExactSequence(errors, "inline code spans", extractMatches(original, INLINE_CODE_REGEX), extractMatches(compressed, INLINE_CODE_REGEX));
  compareExactSequence(errors, "URLs", extractMatches(original, URL_REGEX), extractMatches(compressed, URL_REGEX));
  compareExactSequence(errors, "Markdown links", extractMatches(original, MARKDOWN_LINK_REGEX), extractMatches(compressed, MARKDOWN_LINK_REGEX));
  compareExactSequence(errors, "identifier tokens", extractMatches(original, ID_REGEX), extractMatches(compressed, ID_REGEX));
  compareExactSequence(errors, "table lines", extractMatches(original, TABLE_LINE_REGEX), extractMatches(compressed, TABLE_LINE_REGEX));
  compareExactSequence(errors, "checkbox lines", extractMatches(original, CHECKBOX_LINE_REGEX), extractMatches(compressed, CHECKBOX_LINE_REGEX));
  compareExactSequence(errors, "list prefixes", extractListPrefixes(original), extractListPrefixes(compressed));
  compareExactSequence(errors, "blockquote prefixes", extractBlockquotePrefixes(original), extractBlockquotePrefixes(compressed));
  compareExactSequence(errors, "indented lines", extractIndentedLines(original), extractIndentedLines(compressed));
  compareExactSequence(errors, "HTML comment blocks", extractHtmlCommentBlocks(original), extractHtmlCommentBlocks(compressed));
  compareExactSequence(errors, "Markdown hard-break lines", extractHardBreakLines(original), extractHardBreakLines(compressed));

  for (const parserError of [...getParserErrors(original), ...getParserErrors(compressed)]) {
    if (!errors.includes(parserError)) {
      errors.push(parserError);
    }
  }

  if (compressionMode === "narrative-only") {
    compareExactSequence(errors, "narrative block tag lines", extractNarrativeTagLines(original), extractNarrativeTagLines(compressed));
    compareExactSequence(errors, "lines outside narrative blocks", extractOutsideNarrativeLines(original), extractOutsideNarrativeLines(compressed));
  }

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
  const prefixMatch = line.match(/^(\s*(?:>\s*)*(?:(?:[-*+])\s+|\d+[.)]\s+)?)?(.*)$/);
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
  return text
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/^[,;:\s]+/g, "")
    .trim();
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
    || /^(?:\s*(?:>\s*)*(?:[-*+]|\d+[.)])\s+\[[ Xx]\].*)$/.test(line)
    || /^\s{4,}/.test(line)
    || /^\t/.test(line)
    || /^<!--/.test(line)
    || HTML_LINE_REGEX.test(line)
    || hasMarkdownHardBreak(line)
    || line.includes("`")
    || /\bReport:\s/.test(line)
    || /\[[^\]]+\]\([^\)]+\)/.test(line)
    || /https?:\/\/[^\s)]+/.test(line)
  );
}

function isGovernanceTarget(targetPath) {
  const relativePath = getRepositoryRelativePath(targetPath);
  return relativePath !== null && GOVERNANCE_TARGET_SET.has(relativePath);
}

function getRepositoryRelativePath(targetPath) {
  const relativePath = path.relative(REPOSITORY_ROOT, path.resolve(normalizePath(targetPath)));

  if (relativePath === ".." || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    return null;
  }

  return normalizePath(relativePath);
}

function isNarrativeTagLine(line) {
  return NARRATIVE_TAG_LINE_REGEX.test(line);
}

function updateNarrativeBlockDepth(line, currentDepth) {
  return line.includes("</") ? Math.max(0, currentDepth - 1) : currentDepth + 1;
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

function extractFrontmatterBlocks(text) {
  const lines = text.split("\n");

  if (lines[0]?.trim() !== "---") {
    return [];
  }

  const block = [lines[0]];
  for (let index = 1; index < lines.length; index += 1) {
    block.push(lines[index]);
    if (lines[index].trim() === "---") {
      break;
    }
  }

  return [block.join("\n")];
}

function extractListPrefixes(text) {
  return text.split("\n").flatMap((line) => {
    const match = line.match(LIST_PREFIX_REGEX);
    return match ? [match[0]] : [];
  });
}

function extractBlockquotePrefixes(text) {
  return text.split("\n").flatMap((line) => {
    const match = line.match(BLOCKQUOTE_PREFIX_REGEX);
    return match ? [match[0]] : [];
  });
}

function extractIndentedLines(text) {
  return text.split("\n").filter((line) => /^\s{4,}/.test(line) || /^\t/.test(line));
}

function extractHtmlCommentBlocks(text) {
  const lines = text.split("\n");
  const blocks = [];
  let inComment = false;
  let current = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!inComment && !line.includes("<!--")) {
      continue;
    }

    current.push(line);
    if (!inComment && line.includes("<!--") && !line.includes("-->")) {
      inComment = true;
      continue;
    }

    if (line.includes("-->")) {
      blocks.push(current.join("\n"));
      current = [];
      inComment = false;
    }
  }

  if (current.length > 0) {
    blocks.push(current.join("\n"));
  }

  return blocks;
}

function extractHardBreakLines(text) {
  const { lines } = splitLines(text);
  return lines.filter(hasMarkdownHardBreak);
}

function hasMarkdownHardBreak(line) {
  return / {2,}$/.test(line) || /\\$/.test(line);
}

function extractNarrativeTagLines(text) {
  const { lines } = splitLines(text);
  const tags = [];
  let inFrontmatter = lines[0]?.trim() === "---";
  let inFence = false;
  let fence = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (inFrontmatter) {
      if (index > 0 && line.trim() === "---") {
        inFrontmatter = false;
      }
      continue;
    }

    const transition = advanceFence(line, fence);
    if (transition.matched) {
      fence = transition.fence;
      inFence = fence !== null;
      continue;
    }

    if (!inFence && isNarrativeTagLine(line)) {
      tags.push(line);
    }
  }

  return tags;
}

function extractOutsideNarrativeLines(text) {
  const { lines } = splitLines(text);
  const outside = [];
  let narrativeBlockDepth = 0;
  let inFrontmatter = lines[0]?.trim() === "---";
  let inFence = false;
  let fence = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (inFrontmatter) {
      if (narrativeBlockDepth === 0) {
        outside.push(line);
      }
      if (index > 0 && line.trim() === "---") {
        inFrontmatter = false;
      }
      continue;
    }

    const transition = advanceFence(line, fence);
    if (transition.matched) {
      if (narrativeBlockDepth === 0) {
        outside.push(line);
      }
      fence = transition.fence;
      inFence = fence !== null;
      continue;
    }

    if (inFence) {
      if (narrativeBlockDepth === 0) {
        outside.push(line);
      }
      continue;
    }

    if (isNarrativeTagLine(line)) {
      narrativeBlockDepth = updateNarrativeBlockDepth(line, narrativeBlockDepth);
      continue;
    }

    if (narrativeBlockDepth === 0) {
      outside.push(line);
    }
  }

  return outside;
}

function extractFencedBlocks(text) {
  const { lines } = splitLines(text);
  const blocks = [];
  let inFence = false;
  let current = [];
  let fence = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const transition = advanceFence(line, fence);
    if (!inFence && transition.matched) {
      inFence = true;
      fence = transition.fence;
      current = [line];
      continue;
    }

    if (inFence) {
      current.push(line);
      if (transition.matched && transition.fence === null) {
        blocks.push(current.join("\n"));
        current = [];
        inFence = false;
        fence = null;
      }
    }
  }

  if (current.length > 0) {
    blocks.push(current.join("\n"));
  }

  return blocks;
}

function advanceFence(line, fence) {
  if (fence === null) {
    const opening = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (!opening || (opening[1][0] === "`" && opening[2].includes("`"))) {
      return { matched: false, fence };
    }
    return { matched: true, fence: { character: opening[1][0], length: opening[1].length } };
  }

  const closing = line.match(/^\s{0,3}(`+|~+)[ \t]*$/);
  if (closing && closing[1][0] === fence.character && closing[1].length >= fence.length) {
    return { matched: true, fence: null };
  }
  return { matched: false, fence };
}

function getParserErrors(text) {
  const { lines } = splitLines(text);
  const errors = [];
  let fence = null;
  let frontmatterOpen = false;
  let commentOpen = false;
  const narrativeTags = [];
  const htmlTags = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (frontmatterOpen) {
      if (line.trim() === "---") frontmatterOpen = false;
      continue;
    }

    if (index === 0 && line.trim() === "---") {
      frontmatterOpen = true;
      continue;
    }

    const transition = advanceFence(line, fence);
    if (transition.matched) {
      fence = transition.fence;
      continue;
    }
    if (fence !== null) {
      continue;
    }

    const commentMarkers = line.match(/<!--|-->/g) ?? [];
    for (const marker of commentMarkers) {
      if (marker === "<!--") commentOpen = true;
      else if (commentOpen) commentOpen = false;
      else errors.push("HTML comments: closing marker without opening marker");
    }

    const narrativeMatch = line.match(/^\s*<\/?(rules|workflow)>\s*$/i);
    if (narrativeMatch) {
      const isClosing = line.includes("</");
      const tagName = narrativeMatch[1].toLowerCase();
      if (isClosing) {
        if (narrativeTags.pop() !== tagName) errors.push("narrative tags: mismatched closing tag");
      } else {
        narrativeTags.push(tagName);
      }
    } else if (/<\/?(?:rules|workflow)\b[^>]*>/i.test(line)) {
      errors.push("narrative tags: malformed tag line");
    }

    const htmlOpen = line.match(HTML_BLOCK_OPEN_REGEX);
    if (htmlOpen && !VOID_HTML_TAGS.has(htmlOpen[1].toLowerCase()) && !line.includes("/>")) {
      if (htmlTags.length > 0) errors.push("HTML blocks: nested structures are unsupported");
      htmlTags.push(htmlOpen[1].toLowerCase());
      if (new RegExp(`</${htmlOpen[1]}\\s*>`, "i").test(line)) htmlTags.pop();
    }
    const htmlClose = line.match(/^\s{0,3}<\/(?!rules\s*>|workflow\s*>)([A-Za-z][\w-]*)\s*>/i);
    if (htmlClose) {
      const tagName = htmlClose[1].toLowerCase();
      if (htmlTags.at(-1) === tagName) htmlTags.pop();
      else errors.push("HTML blocks: mismatched closing tag");
    }
  }

  if (frontmatterOpen) errors.push("frontmatter blocks: unclosed frontmatter");
  if (fence !== null) errors.push("fenced code blocks: unclosed fence");
  if (commentOpen) errors.push("HTML comment blocks: unclosed comment");
  if (narrativeTags.length > 0) errors.push("narrative tags: unclosed tag");
  if (htmlTags.length > 0) errors.push("HTML blocks: unclosed block");
  return errors;
}

function getTableLineIndexes(lines) {
  const indexes = new Set();
  for (let index = 1; index < lines.length; index += 1) {
    if (!TABLE_DELIMITER_REGEX.test(lines[index]) || !lines[index - 1].includes("|")) {
      continue;
    }
    indexes.add(index - 1);
    indexes.add(index);
    for (let row = index + 1; row < lines.length && lines[row].includes("|") && lines[row].trim() !== ""; row += 1) {
      indexes.add(row);
    }
  }
  return indexes;
}

function splitLines(text) {
  const lines = [];
  const endings = [];
  const regex = /([^\r\n]*)(\r\n|\n|\r|$)/g;
  for (const match of text.matchAll(regex)) {
    if (match[0] === "") break;
    lines.push(match[1]);
    endings.push(match[2]);
  }
  if (lines.length === 0) {
    return { lines: [""], endings: [""] };
  }
  return { lines, endings };
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
  return String(targetPath).replaceAll("\\", "/");
}

function matchesAny(patterns, targetPath) {
  return patterns.some((pattern) => pattern.test(targetPath));
}

function cloneRegex(regex) {
  return new RegExp(regex.source, regex.flags);
}
