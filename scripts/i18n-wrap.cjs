/* eslint-disable @typescript-eslint/no-require-imports */
// Dev helper: wraps known English UI strings in t("...") inside a TSX file.
// Usage: node scripts/i18n-wrap.cjs <file> <strings.json>
const fs = require("fs");
const [file, listFile] = process.argv.slice(2);
const strings = JSON.parse(fs.readFileSync(listFile, "utf8"));
let source = fs.readFileSync(file, "utf8");
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const missing = [];
for (const text of strings) {
  const before = source;
  const literal = JSON.stringify(text);
  // JSX text between tags, keeping surrounding whitespace.
  source = source.replace(new RegExp(`>(\\s*)${escape(text)}(\\s*)<`, "g"), (_m, a, b) => `>${a}{t(${literal})}${b}<`);
  // Visible-text JSX attributes only (never value/href/key, which must stay as data).
  source = source.replace(new RegExp(`\\b(aria-label|placeholder|title|description|eyebrow|alt)=${escape(literal)}`, "g"), (_m, name) => `${name}={t(${literal})}`);
  // String literals in JSX expressions (ternaries, ||, fallbacks).
  source = source.replace(new RegExp(`([?:|]\\s*)${escape(literal)}`, "g"), (match, prefix, offset, whole) => {
    const lineStart = whole.lastIndexOf("\n", offset) + 1; const before = whole.slice(lineStart, offset);
    // Skip object-literal properties (label:"x"): those are translated where rendered.
    if (prefix.trim() === ":" && /[{,]\s*\w+$/.test(before)) return match;
    return `${prefix}t(${literal})`;
  });
  if (before === source) missing.push(text);
}
fs.writeFileSync(file, source);
if (missing.length) console.log(`${file}: not found ->`, missing);
