import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const dir = mkdtempSync(join(tmpdir(), "supawatch-tmdb-test-"));
const originalFetch = globalThis.fetch;
const originalKey = process.env.TMDB_READ_ACCESS_TOKEN;
const compile = (path, name, replacements = {}) => {
  let code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const [from, to] of Object.entries(replacements)) code = code.replaceAll(JSON.stringify(from), JSON.stringify(to));
  const file = join(dir, name + ".mjs");
  writeFileSync(file, code);
  return pathToFileURL(file).href;
};
const response = (data, status = 200, headers = {}) => Response.json(data, { status, headers });

try {
  process.env.TMDB_READ_ACCESS_TOKEN = "test-read-access-token";
  const tmdbUrl = compile("src/lib/tmdb.ts", "tmdb");
  const T = await import(tmdbUrl);
  let calls = [];
  let release;
  globalThis.fetch = (url, options) => {
    calls.push({ url: new URL(url), options });
    return new Promise(resolve => { release = resolve; });
  };
  const one = T.tmdbFetch("/movie/11", { page: 1, language: "en-US" });
  const two = T.tmdbFetch("/movie/11", { language: "en-US", page: 1 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.Authorization, "Bearer test-read-access-token");
  assert.equal(calls[0].options.next.revalidate, 3600);
  release(response({ id: 11 }));
  assert.deepEqual(await one, await two);

  calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url: new URL(url), options }); return response({ id: 11 }); };
  await T.tmdbFetch("/movie/11/images", { language: null });
  assert.equal(calls[0].url.searchParams.has("language"), false);
  await assert.rejects(T.tmdbFetch("/movie/../account"));
  assert.equal(calls.length, 1);

  let count = 0;
  globalThis.fetch = async () => ++count === 1 ? response({}, 429, { "Retry-After": "0" }) : response({ ok: true });
  assert.equal((await T.tmdbFetch("/movie/12")).ok, true);
  assert.equal(count, 2);
  count = 0;
  globalThis.fetch = async () => { count++; return response({}, 429, { "Retry-After": "60" }); };
  await assert.rejects(T.tmdbFetch("/movie/13"), error => error.status === 429);
  assert.equal(count, 1, "long Retry-After must not be shortened");
  count = 0;
  globalThis.fetch = async () => { count++; return response({}, 404); };
  await assert.rejects(T.tmdbFetch("/movie/14"), error => error.status === 404);
  assert.equal(count, 1, "missing titles are never retried");
  globalThis.fetch = async () => response({ recovered: true });
  assert.equal((await T.tmdbFetch("/movie/14")).recovered, true, "failed promises must be evicted");
  count = 0;
  globalThis.fetch = async () => { if (++count === 1) throw new TypeError("fetch failed"); return response({ recovered: true }); };
  assert.equal((await T.tmdbFetch("/movie/15")).recovered, true);
  assert.equal(count, 2);

  count = 0;
  globalThis.fetch = async () => { count++; throw new DOMException("Timed out", "TimeoutError"); };
  await assert.rejects(T.tmdbFetch("/movie/16"), error => error.status === 504);
  assert.equal(count, 2, "timeouts stop after two attempts");
  count = 0;
  globalThis.fetch = async () => { count++; return response({}, 401); };
  await assert.rejects(T.tmdbFetch("/movie/17"), error => error.status === 401);
  assert.equal(count, 1, "invalid credentials are not retried");

  let active = 0, peak = 0;
  globalThis.fetch = async () => {
    peak = Math.max(peak, ++active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    return response({});
  };
  await Promise.all(Array.from({ length: 20 }, (_, i) => T.tmdbFetch(`/movie/${100 + i}`)));
  assert.ok(peak <= 8);
  assert.equal(T.jsonFromError(new T.TmdbError(401, "Upstream auth")).status, 502);
  assert.equal(T.jsonFromError(new T.TmdbError(429, "Busy")).status, 503);
  assert.equal(T.jsonOk({}, 200, { sMaxAge: 0 }).headers.get("Cache-Control"), "no-store");
  assert.equal(T.jsonErr("Missing", 404).headers.get("Cache-Control"), "no-store");

  process.env.TMDB_READ_ACCESS_TOKEN = "a".repeat(32);
  const v3 = await import(tmdbUrl + "?v3");
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).searchParams.get("api_key"), "a".repeat(32));
    assert.equal(options.headers.Authorization, undefined);
    return response({});
  };
  await v3.tmdbFetch("/movie/11");
  console.log("PASS TMDB auth, canonical deduplication, bounded fan-out, retries, error mapping, failure eviction");

  writeFileSync(join(dir, "react.mjs"), "export const cache = fn => fn;");
  const M = await import(compile("src/lib/media.ts", "media", { react: "./react.mjs", "@/lib/tmdb": "./tmdb.mjs" }));
  const video = { site: "YouTube", type: "Trailer", key: "abcdefghijk", iso_639_1: "en" };
  assert.deepEqual(M.rankTrailerKeys([{ ...video, key: "bad/key" }, { ...video, type: "Clip" }, video, video, { ...video, key: "lmnopqrstuv", official: true }]), ["lmnopqrstuv", "abcdefghijk"]);
  calls = [];
  globalThis.fetch = async (url) => {
    calls.push(new URL(url));
    return response({ id: 11, original_language: "en", images: { logos: [{ iso_639_1: "en", file_path: "/logo.png" }] }, credits: { cast: [] }, videos: { results: [video] } });
  };
  const detail = await M.getEnhancedMediaDetails("movie", "11");
  assert.equal(calls.length, 1, "complete detail uses one combined request");
  assert.equal(detail.data.images, undefined);
  assert.equal(detail.data.videos, undefined);
  assert.deepEqual(detail.trailerKeys, [video.key]);
  assert.equal(detail.logo, "/logo.png");
  calls = [];
  globalThis.fetch = async (url) => {
    calls.push(new URL(url));
    if (String(url).includes("/videos?")) return response({ results: [{ ...video, iso_639_1: "ko" }] });
    if (new URL(url).pathname.endsWith("/images")) return response({ logos: [] });
    return response({ id: 11, original_language: "ko", images: { logos: [] }, videos: { results: [] } });
  };
  assert.equal((await M.getEnhancedMediaDetails("movie", "11")).trailerKey, video.key);
  assert.equal(calls.length, 3, "at most one image and one language fallback");
  assert.equal(calls.find(url => url.pathname.endsWith("/images")).searchParams.has("language"), false);
  assert.equal(calls.find(url => url.pathname.endsWith("/videos")).searchParams.get("language"), "ko");
  globalThis.fetch = async url => new URL(url).pathname.endsWith("/images")
    ? response({}, 404)
    : response({ id: 11, original_language: "en", images: { logos: [] }, videos: { results: [video] } });
  const degraded = await M.getEnhancedMediaDetails("movie", "11");
  assert.equal(degraded.data.id, 11, "optional artwork failure must not hide the title");
  assert.equal(degraded.partial, true, "degraded details must bypass the API/browser cache");
  console.log("PASS trailer ranking, invalid keys, combined detail payload, bounded language/image fallbacks");

  const C = await import(compile("src/lib/client-api.ts", "client"));
  count = 0;
  globalThis.fetch = async () => { count++; return response({ value: 1 }); };
  await Promise.all([C.fetchJson("/api/test?b=2&a=1"), C.fetchJson("/api/test?a=1&b=2")]);
  assert.equal(count, 1);
  await C.fetchJson("/api/test?a=1&b=2", { ttlMs: 0 });
  assert.equal(count, 2, "zero TTL bypasses existing cache");
  globalThis.fetch = async () => { count++; return response({ partial: true }, 200, { "Cache-Control": "no-store" }); };
  await C.fetchJson("/api/partial");
  await C.fetchJson("/api/partial");
  assert.equal(count, 4, "partial data must not be cached");
  globalThis.fetch = async () => new Response("not json");
  await assert.rejects(C.fetchJson("/api/invalid"));
  C.clearJsonCache();
  count = 0;
  globalThis.fetch = async () => { count++; return response({}); };
  for (let i = 0; i < 201; i++) await C.fetchJson(`/api/title?id=${i}`);
  await C.fetchJson("/api/title?id=200");
  assert.equal(count, 201, "recent entries are reused");
  await C.fetchJson("/api/title?id=0");
  assert.equal(count, 202, "old entries are evicted after prolonged browsing");
  console.log("PASS bounded client cache, canonical URLs, cache bypass, partial responses and malformed JSON");

  compile("src/lib/geo.ts", "geo");
  const D = await import(compile("src/lib/discover-params.ts", "discover-params", { "@/lib/tmdb": "./tmdb.mjs", "@/lib/geo": "./geo.mjs" }));
  const providerParams = new URLSearchParams("watch_region=IN&with_watch_monetization_types=flatrate&with_networks=49");
  assert.equal(D.buildParams(providerParams, true).watch_region, "IN");
  assert.equal(D.buildParams(providerParams, true).with_networks, undefined);
  assert.equal(D.buildParams(providerParams, false).with_networks, "49");
  console.log("PASS subscription-only discovery retains its region and network filters stay TV-specific");

  const routeUrl = compile("src/app/api/getGenreMixed/route.ts", "genre", { "@/lib/tmdb": "./tmdb.mjs" });
  const route = await import(routeUrl);
  globalThis.fetch = async url => String(url).includes("/movie?") ? response({ results: [{ id: 11 }], total_pages: 2 }) : response({}, 404);
  const partial = await route.GET(new Request("http://localhost/api/getGenreMixed?id=18"));
  assert.equal(partial.status, 200);
  assert.equal(partial.headers.get("Cache-Control"), "no-store");
  assert.equal((await partial.json()).partial, true);
  globalThis.fetch = async () => response({}, 404);
  assert.equal((await route.GET(new Request("http://localhost/api/getGenreMixed?id=18"))).status, 503);
  assert.equal((await route.GET(new Request("http://localhost/api/getGenreMixed?id=bad"))).status, 400);
  console.log("PASS mixed API partial recovery, total failure and invalid input");
} finally {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.TMDB_READ_ACCESS_TOKEN;
  else process.env.TMDB_READ_ACCESS_TOKEN = originalKey;
  rmSync(dir, { recursive: true, force: true });
}
