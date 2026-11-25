/**
 * No em dashes in user-visible copy.
 *
 * Owner decision 25 Nov 2026: an em dash (U+2014) reads as AI-written, so no
 * visitor- or admin-facing string on liboworld.com may contain one. A spaced
 * en dash used as a dash (" – ") counts too. Number ranges like "3–5" are fine.
 *
 * Scans:
 *   - every locale JSON under src/i18n (all string values)
 *   - every .ts/.tsx file under src, after stripping // and block comments
 *   - index.html (outside HTML comments) and the hand-written
 *     public/workout-facet-copy.json
 *
 * Generated data (public/exercises*.json, workouts.json, faq.json) is out of
 * scope: it comes from the database or from the files scanned here.
 *
 * Fix a failure by rewriting the sentence the way a person would type it
 * (full stop, comma, colon or parentheses), never with " - " or "–".
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const BAD = /—| – /;

function walk(dir: string, exts: string[], out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, out);
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

/**
 * Replace comment bodies with spaces (newlines kept, so line numbers survive).
 * A small scanner that knows about '...', "..." and `...` strings, so a `//`
 * inside "https://..." is not mistaken for a comment.
 */
function stripComments(src: string): string {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '/') {
      while (i < n && src[i] !== '\n') {
        out += ' ';
        i++;
      }
    } else if (c === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      for (; i < stop; i++) out += src[i] === '\n' ? '\n' : ' ';
    } else if (c === '"' || c === "'" || c === '`') {
      out += c;
      i++;
      while (i < n && src[i] !== c) {
        if (src[i] === '\\') {
          out += src[i] + (src[i + 1] ?? '');
          i += 2;
          continue;
        }
        // Plain quotes never span lines; bail so a stray apostrophe in JSX
        // text ("don't") cannot swallow the rest of the file.
        if (src[i] === '\n' && c !== '`') break;
        out += src[i];
        i++;
      }
      if (i < n && src[i] === c) {
        out += c;
        i++;
      }
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

function offendingLines(file: string, text: string): string[] {
  const rel = path.relative(ROOT, file);
  return text
    .split('\n')
    .map((line, idx) => (BAD.test(line) ? `${rel}:${idx + 1}: ${line.trim().slice(0, 160)}` : null))
    .filter((x): x is string => x !== null);
}

describe('no em dashes in user-visible copy', () => {
  it('locale JSON values contain no em dash', () => {
    const hits: string[] = [];
    for (const file of walk(path.join(SRC, 'i18n'), ['.json'])) {
      hits.push(...offendingLines(file, fs.readFileSync(file, 'utf8')));
    }
    const facet = path.join(ROOT, 'public', 'workout-facet-copy.json');
    if (fs.existsSync(facet)) {
      // Skip the _comment key: it is a note for editors, never rendered.
      const lines = fs
        .readFileSync(facet, 'utf8')
        .split('\n')
        .map((l) => (l.trim().startsWith('"_comment"') ? '' : l));
      hits.push(...offendingLines(facet, lines.join('\n')));
    }
    if (hits.length) console.error(hits.join('\n'));
    expect(hits).toEqual([]);
  });

  it('source files contain no em dash outside comments', () => {
    const hits: string[] = [];
    for (const file of walk(SRC, ['.ts', '.tsx'])) {
      if (file.endsWith('.d.ts')) continue;
      hits.push(...offendingLines(file, stripComments(fs.readFileSync(file, 'utf8'))));
    }
    const html = path.join(ROOT, 'index.html');
    const htmlText = fs
      .readFileSync(html, 'utf8')
      .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
    hits.push(...offendingLines(html, stripComments(htmlText)));
    if (hits.length) console.error(hits.join('\n'));
    expect(hits).toEqual([]);
  });
});
