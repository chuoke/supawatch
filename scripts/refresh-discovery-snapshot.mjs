// Refresh verified catalogue picks used when live discovery is unavailable.
import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
loadEnvConfig(process.cwd());
const code = ts.transpileModule(readFileSync('src/lib/discovery.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { COLLECTIONS, normalizeTitle } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const key = (process.env.TMDB_READ_ACCESS_TOKEN ?? process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY)?.trim();
if (!key) throw Error('TMDB credentials required');
const today = new Date().toISOString().slice(0, 10);
const jobs = [...COLLECTIONS.map(c => ({ key: c.slug, type: c.type, params: c.params })), ...['movie','tv'].flatMap(type => [null, 'IN'].map(region => ({ key: `${type}-${region ?? 'global'}`, type, params: region ? { with_origin_country: region } : {} })))];
const selections = {};
for (let i = 0; i < jobs.length; i += 4) {
  await Promise.all(jobs.slice(i,i+4).map(async job => {
    const url = new URL(`https://api.themoviedb.org/3/discover/${job.type}`);
    const params = { include_adult: false, language: 'en-US', sort_by: 'popularity.desc', 'vote_average.gte': 7, 'vote_count.gte': 100, [job.type === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte']: today, ...job.params };
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, String(v)));
    const headers = {};
    if (/^[a-f0-9]{32}$/i.test(key)) url.searchParams.set('api_key', key); else headers.Authorization = `Bearer ${key}`;
    let response;
    for (let retry=0; retry<3; retry++) {
      try { response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) }); if(response.ok) break; } catch { /* Retry transient connection failures. */ }
    }
    if (!response?.ok) throw Error(`Snapshot could not load: ${job.key}`);
    const data = await response.json();
    selections[job.key] = (data.results ?? []).flatMap(raw => { const item = normalizeTitle({ ...raw, ...(params.with_origin_country ? { origin_country: [params.with_origin_country] } : {}) }, job.type); return item ? [item] : []; });
    console.log(`${job.key}: ${selections[job.key].length} titles`);
  }));
}
writeFileSync('src/lib/discovery-snapshot.json', JSON.stringify({ updated: today, selections }));
