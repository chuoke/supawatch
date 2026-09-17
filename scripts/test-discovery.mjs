/* eslint-disable react-hooks/rules-of-hooks -- Hook exports are exercised with an explicit React test stub. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const compile = path => ts.transpileModule(readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const url = code => "data:text/javascript;base64," + Buffer.from(code).toString("base64");
const discoveryUrl = url(compile("src/lib/discovery.ts"));
const D = await import(discoveryUrl);
const raw = (id, extra = {}) => ({ id, title: "Film " + id, poster_path: "/poster.jpg", overview: "A story.", vote_count: 1000, vote_average: 8, genre_ids: [18], original_language: "en", ...extra });
const film = D.normalizeTitle(raw(1));
const series = D.normalizeTitle(raw(1, { media_type: "tv" }));
assert.notEqual(D.titleKey(film), D.titleKey(series));
assert.equal(D.normalizeTitle(raw(2, { adult: true })), null);
assert.equal(D.normalizeTitle(raw(2, { media_type: "person" })), null);
assert.equal(D.normalizeTitle(raw(2, { poster_path: null })), null);
assert.equal(D.normalizeTitle(raw("2")), null);
assert.equal(D.getMood("unknown").id, "open");
assert.equal(D.selectTitles([film, series, film], 10, 1).length, 2);
assert.deepEqual(D.selectTitles([film, series], 10, 1, new Set(["movie-1"])), [series]);
const pool = Array.from({length: 60}, (_, i) => D.normalizeTitle(raw(i + 1, { original_language: i % 3 ? "en" : "ko", genre_ids: [i % 4] })));
assert.deepEqual(D.selectTitles(pool, 6, 100), D.selectTitles(pool, 6, 100));
assert.notDeepEqual(D.selectTitles(pool, 6, 100), D.selectTitles(pool, 6, 9876));
assert.equal(D.selectTitles([D.normalizeTitle(raw(99, {vote_count: 1, vote_average: 10})), film], 6, 100).length, 1);
assert.equal(D.COLLECTIONS.find(c => c.slug === "rewind").params["primary_release_date.lte"], "1999-12-31");
console.log("PASS normalization, composite identity, exclusions, quality floor, seeded rotation and collection boundaries");

const store = new Map();
globalThis.localStorage = {getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,v)};
globalThis.window = new EventTarget();
const hooksUrl = url("export const useSyncExternalStore = (subscribe, read) => read();");
const watchCode = compile("src/lib/watchlist.ts").replace('"react"', JSON.stringify(hooksUrl)).replace('"@/lib/discovery"', JSON.stringify(discoveryUrl));
const W = await import(url(watchCode));
assert.deepEqual(W.useWatchlist(), []);
assert.equal(W.toggleSaved(film), true);
assert.equal(W.toggleSaved(series), true);
assert.equal(W.useWatchlist().length, 2);
assert.equal(W.toggleSaved(film), true);
assert.deepEqual(W.useWatchlist(), [series]);
store.delete("sw-watchlist-v1");
assert.deepEqual(W.useWatchlist(), []);
store.set("sw-watchlist-v1", JSON.stringify([film, film, null, {id:"bad"}, series]));
assert.equal(W.useWatchlist().length, 2);
localStorage.setItem = () => {throw Error("Storage blocked");};
assert.equal(W.toggleSaved(film), false);
assert.equal(W.useWatchlist().length, 2);
console.log("PASS save/remove, movie–series ID collisions, external clear, corrupt entries and blocked storage");

