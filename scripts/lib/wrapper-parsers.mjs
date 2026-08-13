function error(message) {
  throw new Error(message);
}

export function parseJsonc(source) {
  let index = 0;
  const skip = () => {
    while (index < source.length) {
      if (/\s/.test(source[index])) { index += 1; continue; }
      if (source.startsWith("//", index)) {
        const end = source.indexOf("\n", index + 2);
        index = end === -1 ? source.length : end + 1;
        continue;
      }
      if (source.startsWith("/*", index)) {
        const end = source.indexOf("*/", index + 2);
        if (end === -1) error("unterminated JSONC comment");
        index = end + 2;
        continue;
      }
      break;
    }
  };
  const string = () => {
    const start = index++;
    let escaped = false;
    while (index < source.length) {
      const character = source[index++];
      if (!escaped && character === '"') return JSON.parse(source.slice(start, index));
      if (!escaped && character === "\\") escaped = true;
      else escaped = false;
    }
    error("unterminated JSONC string");
  };
  const value = () => {
    skip();
    if (source[index] === '"') return string();
    if (source[index] === "{") {
      index += 1;
      const object = {};
      skip();
      while (source[index] !== "}") {
        if (index >= source.length || source[index] !== '"') error("expected JSONC object key");
        const key = string();
        if (Object.hasOwn(object, key)) error(`duplicate JSONC key: ${key}`);
        skip();
        if (source[index++] !== ":") error("expected JSONC colon");
        object[key] = value();
        skip();
        if (source[index] === "}") break;
        if (source[index++] !== ",") error("expected JSONC comma");
        skip();
      }
      if (source[index++] !== "}") error("unterminated JSONC object");
      return object;
    }
    if (source[index] === "[") {
      index += 1;
      const array = [];
      skip();
      while (source[index] !== "]") {
        if (index >= source.length) error("unterminated JSONC array");
        array.push(value());
        skip();
        if (source[index] === "]") break;
        if (source[index++] !== ",") error("expected JSONC comma");
        skip();
      }
      index += 1;
      return array;
    }
    const token = source.slice(index).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/)?.[0];
    if (!token) error("invalid JSONC value");
    index += token.length;
    return token === "true" ? true : token === "false" ? false : token === "null" ? null : Number(token);
  };
  const result = value();
  skip();
  if (index !== source.length) error("trailing JSONC content");
  return result;
}

function yamlScalar(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null" || value === "~") return null;
  if (value.startsWith('"')) {
    try { return JSON.parse(value); } catch { error("invalid quoted YAML scalar"); }
  }
  if (value.startsWith("'")) {
    if (!value.endsWith("'") || value.length < 2) error("invalid quoted YAML scalar");
    return value.slice(1, -1).replaceAll("''", "'");
  }
  if (/^[\[\]{},&*!|>@`]/.test(value) || /\s#/.test(value) || !value) error("unsupported YAML scalar");
  return value;
}

export function parseYamlFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) error("missing YAML frontmatter");
  const root = {};
  const stack = [{ indent: -1, value: root }];
  for (const raw of match[1].split(/\r?\n/)) {
    if (!raw || /^\s*#/.test(raw)) continue;
    const line = raw.match(/^( *)([A-Za-z][A-Za-z0-9_-]*|"[^"]+"|\*):(?: +(.*))?$/);
    if (!line || line[1].length % 2 !== 0) error("invalid YAML mapping");
    const indent = line[1].length;
    while (stack.at(-1).indent >= indent) stack.pop();
    const parent = stack.at(-1);
    if (!parent || indent > parent.indent + 2) error("invalid YAML indentation");
    const [, , rawKey, scalar] = line;
    const key = rawKey.startsWith('"') ? JSON.parse(rawKey) : rawKey;
    if (Object.hasOwn(parent.value, key)) error(`duplicate YAML key: ${key}`);
    if (scalar === undefined) {
      parent.value[key] = {};
      stack.push({ indent, value: parent.value[key] });
    } else parent.value[key] = yamlScalar(scalar);
  }
  return root;
}

export function parseToml(source) {
  const result = {};
  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const assignment = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(.*)$/);
    if (!assignment) error("invalid TOML syntax");
    const [, key, raw] = assignment;
    if (Object.hasOwn(result, key)) error(`duplicate TOML key: ${key}`);
    if (raw === '"""') {
      const body = [];
      while (++index < lines.length && lines[index] !== '"""') body.push(lines[index]);
      if (index === lines.length) error("unterminated TOML multiline string");
      result[key] = body.join("\n");
    } else if (raw.startsWith('"')) {
      if (!raw.endsWith('"') || raw.length < 2) error("unterminated TOML string");
      try { result[key] = JSON.parse(raw); } catch { error("invalid TOML string"); }
    } else error("unsupported TOML value");
  }
  return result;
}

export function validateSchema(value, schema) {
  for (const key of Object.keys(value)) if (!Object.hasOwn(schema, key)) error(`unsupported metadata: ${key}`);
  for (const [key, rule] of Object.entries(schema)) {
    const actual = value[key];
    if (rule.required && actual === undefined) error(`missing metadata: ${key}`);
    if (actual === undefined) continue;
    if (rule.type === "object") {
      if (!actual || Array.isArray(actual) || typeof actual !== "object") error(`metadata ${key} must be an object`);
    } else if (typeof actual !== rule.type) error(`metadata ${key} must be a ${rule.type}`);
    if (rule.values && !rule.values.includes(actual)) error(`metadata ${key} has an unsupported value`);
  }
  return value;
}
