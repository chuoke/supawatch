/* Checks the watch-history store against a stub localStorage.
   history.ts is browser-only and has no test runner behind it, but it holds
   the one copy of data the user can't get back — dedupe and import/export
   have to be right. Run with `npm run test:history`. */
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const ts = (await import("typescript")).default;

const src = readFileSync("src/lib/history.ts", "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const path = join(tmpdir(), `sw-history-${process.pid}.mjs`);
writeFileSync(path, js);

const store = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const H = await import(path);
const t0 = Date.UTC(2026, 0, 1, 20, 0);
const ok = [];
const check = (name, cond, extra="") => ok.push(`${cond ? "PASS" : "FAIL"}  ${name}${extra?` (${extra})`:""}`);

// 1. basic append
H.recordWatch({ id: 27205, t: "movie", n: "Inception" }, t0);
check("records a play", H.getHistory().length === 1);

// 2. StrictMode double-fire / reload within the window is one play
H.recordWatch({ id: 27205, t: "movie", n: "Inception" }, t0 + 1000);
check("dedupes a repeat inside the window", H.getHistory().length === 1, `got ${H.getHistory().length}`);

// 3. same title later is a genuine rewatch
H.recordWatch({ id: 27205, t: "movie", n: "Inception" }, t0 + 3 * 3600e3);
check("counts a later rewatch", H.getHistory().length === 2, `got ${H.getHistory().length}`);

// 4. consecutive episodes are distinct plays even back to back
H.recordWatch({ id: 1396, t: "tv", sn: 1, ep: 1 }, t0 + 10);
H.recordWatch({ id: 1396, t: "tv", sn: 1, ep: 2 }, t0 + 20);
H.recordWatch({ id: 1396, t: "tv", sn: 1, ep: 3 }, t0 + 30);
check("each episode is its own play", H.getHistory().length === 5, `got ${H.getHistory().length}`);

// 5. but the same episode twice in a sitting is not
H.recordWatch({ id: 1396, t: "tv", sn: 1, ep: 3 }, t0 + 40);
check("dedupes a repeated episode", H.getHistory().length === 5, `got ${H.getHistory().length}`);

// 6. export -> clear -> import restores exactly
const backup = H.exportHistory();
const before = JSON.stringify(H.getHistory());
H.clearHistory();
check("clear empties history", H.getHistory().length === 0);
const r1 = H.importHistory(backup);
check("import restores every play", JSON.stringify(H.getHistory()) === before, `added ${r1.added}`);

// 7. re-importing the same file is idempotent (no phantom rewatches)
const r2 = H.importHistory(backup);
check("re-import adds nothing", r2.added === 0 && H.getHistory().length === 5, `added ${r2.added}, skipped ${r2.skipped}`);

// 8. junk is rejected loudly, not silently absorbed
try { H.importHistory("not json"); check("rejects invalid JSON", false); }
catch { check("rejects invalid JSON", true); }
try { H.importHistory('{"events":"nope"}'); check("rejects wrong shape", false); }
catch { check("rejects wrong shape", true); }

// 9. malformed rows inside a valid file are skipped, good rows kept
const mixed = JSON.stringify({ events: [{ id: 9, t: "movie", ts: t0 + 9e6 }, { id: "bad" }, null] });
const r3 = H.importHistory(mixed);
check("keeps good rows, skips bad", r3.added === 1 && r3.skipped === 2, `added ${r3.added}, skipped ${r3.skipped}`);

console.log(ok.join("\n"));
rmSync(path, { force: true });

const failed = ok.filter((line) => line.startsWith("FAIL"));
console.log(failed.length ? `\n${failed.length} FAILED` : "\nall green");
process.exit(failed.length ? 1 : 0);
