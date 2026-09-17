import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const moduleUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
const compile = path => ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const mods = new Map();
mods.set('@/lib/tmdb', moduleUrl(`export const CACHE={hour:3600,fiveMinutes:300};export const jsonOk=(data,status=200)=>({data,status});export const jsonErr=(error,status)=>({error,status});export const jsonFromError=error=>({error,status:502});export const sanitizePage=v=>String(Math.max(1,Math.min(500,Number(v)||1)));export const tmdbFetch=(...args)=>globalThis.fetchTitles(...args);`));
mods.set('@/lib/geo', moduleUrl(`export const resolveRegionOrNull=value=>['IN','US'].includes(value)?value:null;`));
mods.set('@/lib/discovery-snapshot.json', moduleUrl(`export default ${readFileSync('src/lib/discovery-snapshot.json','utf8')}`));
function load(path) {
  const key = '@/'+path.replace(/^src\//,'').replace(/\.ts$/,'');
  if(mods.has(key))return mods.get(key);
  const code = compile(path).replace(/import "server-only";/g,'').replace(/"(@\/[^\"]+)"/g,(_,dep)=>JSON.stringify(mods.get(dep) ?? load(dep.replace('@/', 'src/')+'.ts')));
  const url=moduleUrl(code);mods.set(key,url);return url;
}
const D=await import(load('src/lib/discovery.ts'));
const F=await import(load('src/lib/discovery-fallback.ts'));
const feed=await import(load('src/app/api/feed/route.ts'));
const search=await import(load('src/app/api/getSearch/route.ts'));
const request=q=>new Request('https://supawatch.test/api/feed?'+q);
let calls=[];
globalThis.fetchTitles=async(endpoint,params)=>{
  calls.push({endpoint,params});
  const local=params.with_origin_country;
  const base=(local==='IN'?10000:local==='US'?20000:30000)+(endpoint.endsWith('tv')?1000:0)+(params['with_runtime.lte']?200:0)+(params['vote_count.lte']?400:0);
  const date=params['primary_release_date.lte']==='1999-12-31'||params['first_air_date.lte']==='1999-12-31'?'1990-01-01':'2024-01-01';
  return { results: Array.from({length:20},(_,i)=>({id:base+i,title:`Title ${base+i}`,poster_path:'/poster.jpg',overview:'A synopsis.',genre_ids:[18,35],vote_average:8.5,vote_count:600,release_date:date,first_air_date:date})),total_pages:5 };
};
const india=await feed.GET(request('region=IN'));
assert.equal(india.status,200);
assert.ok(india.data.lanes.length>=5);
assert.ok(india.data.lanes.slice(0,4).every(lane=>lane.items.some(item=>item.origin_country.includes('IN'))));
assert.ok(india.data.lanes.every(lane=>lane.items.length>0));
assert.ok(india.data.lanes.every(lane=>new Set(lane.items.map(D.titleKey)).size===lane.items.length));
const usa=await feed.GET(request('region=US'));
assert.ok(usa.data.lanes[0].items.some(item=>item.origin_country.includes('US')));
calls=[];
const filtered=await feed.GET(request('region=IN&format=tv&period=classics&rating=8'));
assert.ok(filtered.data.lanes.every(lane=>lane.items.every(item=>item.media_type==='tv' && item.date<'2000' && item.vote_average>=8)));
assert.ok(calls.every(call=>call.endpoint==='/discover/tv'&&call.params['vote_average.gte']>=8&&!call.params['first_air_date.gte']));
console.log('PASS region influences multiple lanes; deduplication, format, rating and classic-era constraints');
const sample=india.data.lanes[0].items;
assert.ok(D.fillLane(sample,6,1,new Set(sample.map(D.titleKey))).length);
assert.equal(D.matchesFeedFilters(sample[0],new URLSearchParams('format=tv')),sample[0].media_type==='tv');
for(const mode of ['empty','offline']) {
  globalThis.fetchTitles=async()=>{if(mode==='offline')throw Error('Offline');return {results:[]};};
  const result=await feed.GET(request('region=IN&format=tv&period=classics&rating=8'));
  assert.equal(result.status,200);assert.ok(result.data.lanes.every(l=>l.items.length));
  assert.ok(result.data.lanes.flatMap(l=>l.items).every(i=>i.media_type==='tv'));
  assert.ok(result.data.notice);
}
assert.equal(D.COLLECTIONS.length,20);
assert.ok(D.COLLECTIONS.every(c=>F.savedCollection(c.slug).length>=4));
console.log('PASS sparse and failed sources show labelled saved suggestions; all 20 collections have verified fallback titles');
calls=[];
globalThis.fetchTitles=async(endpoint,params)=>{calls.push({endpoint,params});return {total_pages:7,results:[{id:params.page,title:'Match',media_type:'movie',genre_ids:[18],vote_average:params.page===2?8:5,release_date:'1998-01-01'}]};};
const results=await search.GET(new Request('https://supawatch.test/api/getSearch?query=Match&vote_average_gte=8&year_to=1999'));
assert.equal(results.data.data.results.length,1);assert.equal(results.data.data.results[0].id,2);assert.equal(results.data.data.total_pages,3);assert.equal(calls.length,3);
const second=await search.GET(new Request('https://supawatch.test/api/getSearch?query=Match&vote_average_gte=8&year_to=1999&page=2'));
assert.equal(second.data.data.results.length,0);assert.equal(second.data.data.total_pages,3);
assert.equal(calls[3].params.page,4);
console.log('PASS filtered search scans beyond the first page and preserves pagination through empty batches');

// The additional home shelves reuse pools, stay true to their genre, and keep filters.
globalThis.fetchTitles=async()=>({results:[]});
const expanded = await feed.GET(request('region=IN'));
for (const [id, genre] of [['comedy',35], ['mystery',9648], ['animation',16], ['documentaries',99]]) {
  const lane = expanded.data.lanes.find(lane=>lane.id===id);
  assert.ok(lane?.items.length, `${id} should have saved picks when discovery is empty`);
  assert.ok(lane.items.every(item=>item.genre_ids.includes(genre)));
}
const documentaryOnly = await feed.GET(request('mood=real&format=movie&rating=8'));
assert.ok(documentaryOnly.data.lanes.filter(lane=>lane.id!=='saved-picks').every(lane=>lane.items.every(item=>item.media_type==='movie'&&item.vote_average>=8&&item.genre_ids.includes(99))));
assert.ok(!documentaryOnly.data.lanes.some(lane=>['comedy','mystery','animation'].includes(lane.id)));
console.log('PASS four additional home sections preserve genre, mood, format and rating constraints during empty responses');
