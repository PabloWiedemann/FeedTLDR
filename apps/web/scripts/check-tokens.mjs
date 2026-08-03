#!/usr/bin/env node
/**
 * Design-token guard (docs/ENGINEERING.md §3.1).
 *
 * Fails the build when a component hard-codes a design decision instead of
 * using a token: raw colours, arbitrary Tailwind values carrying a real
 * measurement, Tailwind's default shadow scale, or static inline styles.
 *
 * Run: pnpm check:tokens
 */
import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE_DIRS = ["app", "components", "lib"];
const SOURCE_EXTENSIONS = [".ts", ".tsx"];
const IGNORED_FILES = new Set(["lib/api/schema.d.ts"]);
/** The one file allowed to declare raw values: it is where tokens are born. */
const TOKEN_SOURCE = "app/globals.css";

/**
 * An arbitrary value is a design decision when it states an absolute size
 * (`3px`, `1.15rem`, `-0.02em`) or a bare number (`0.96`). Values expressed
 * relative to their context — percentages, viewport and content units, grid
 * fractions, and anything derived with calc()/var() — describe a layout
 * relationship, not a design token, and stay allowed.
 */
const DERIVED_VALUE = /(calc|clamp|min|max|var)\(/;
const ABSOLUTE_LENGTH = /\d\s*(px|rem|em)\b/;
const BARE_NUMBER = /^-?\d*\.?\d+$/;

const RULES = [
  {
    id: "raw-color",
    pattern: /#[0-9a-fA-F]{3,8}\b/g,
    message: "raw hex colour — use a semantic colour token (bg-primary, text-muted-foreground)",
  },
  {
    id: "raw-color-function",
    pattern: /\b(rgba?|hsla?)\(/g,
    message: "raw colour function — use a semantic colour token",
  },
  {
    id: "arbitrary-value",
    pattern: /\b[a-z][a-zA-Z0-9]*(?:-[a-z0-9]+)*-\[([^\]]+)\]/g,
    message:
      "arbitrary Tailwind value — use a scale utility, a theme token, or add one in globals.css",
    allow: (_match, value) =>
      DERIVED_VALUE.test(value) ||
      (!ABSOLUTE_LENGTH.test(value) && !BARE_NUMBER.test(value)),
  },
  {
    id: "default-shadow",
    pattern: /\bshadow-(2xs|xs|sm|md|lg|xl|2xl)\b/g,
    message: "Tailwind default shadow — use shadow-overlay or shadow-lift (DESIGN.md §4)",
  },
  {
    id: "static-inline-style",
    pattern: /style=\{\{(?![^}]*\$\{)[^}]*\}\}/g,
    message: "static inline style — use a utility class (text-pretty, text-balance, …)",
  },
];

async function collectSourceFiles(dir) {
  const entries = await readdir(join(ROOT, dir), { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(path);
      const isSource = SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext));
      return isSource && !IGNORED_FILES.has(path) ? [path] : [];
    })
  );
  return files.flat();
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function findViolations(path, source) {
  return RULES.flatMap((rule) =>
    [...source.matchAll(rule.pattern)]
      .filter((match) => !rule.allow?.(match[0], match[1]))
      .map((match) => ({
        path,
        line: lineNumberAt(source, match.index),
        rule: rule.id,
        snippet: match[0].trim().slice(0, 72),
        message: rule.message,
      }))
  );
}

/** In the token source only colours are checked: it is where measurements live. */
function findTokenSourceViolations() {
  const withoutComments = readFileSync(join(ROOT, TOKEN_SOURCE), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    ""
  );
  return findViolations(TOKEN_SOURCE, withoutComments).filter((violation) =>
    violation.rule.startsWith("raw-color")
  );
}

const sourceFiles = (await Promise.all(SOURCE_DIRS.map(collectSourceFiles))).flat();
const violations = [
  ...sourceFiles.flatMap((path) =>
    findViolations(path, readFileSync(join(ROOT, path), "utf8"))
  ),
  ...findTokenSourceViolations(),
];

if (violations.length === 0) {
  console.log(`check-tokens: ${sourceFiles.length + 1} files clean`);
  process.exit(0);
}

console.error(`check-tokens: ${violations.length} hard-coded design value(s)\n`);
for (const { path, line, rule, snippet, message } of violations) {
  console.error(`  ${relative(".", path)}:${line}  [${rule}]  ${snippet}`);
  console.error(`    ↳ ${message}\n`);
}
console.error("See docs/ENGINEERING.md §3.1 for the allowed replacements.");
process.exit(1);
