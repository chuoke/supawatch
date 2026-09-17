import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compile = path => ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const url = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
const { episodeRating, episodeRatingBand, EPISODE_RATING_BANDS } = await import(url(compile('src/lib/episode-ratings.ts')));
for (const value of [undefined, NaN, Infinity, -1, 0, 11]) assert.equal(episodeRating({vote_average:value}),null);
assert.equal(episodeRating({vote_average:8.5,vote_count:0}),null);
assert.equal(episodeRating({vote_average:8.5,vote_count:50}),8.5);
assert.equal(episodeRatingBand(null),null);
for (const [value,min] of [[4.2,0],[5,5],[6,6],[7,7],[8,8],[9,9],[10,9]]) assert.equal(episodeRatingBand(episodeRating({vote_average:value})).min,min);
assert.equal(episodeRating({vote_average:8.96}),9);
assert.equal(episodeRatingBand(8.96).min,9);
assert.equal(new Set(EPISODE_RATING_BANDS.map(band=>band.color)).size,6);
console.log('PASS fixed color bands, rating boundaries, displayed rounding, and unrated episodes');
// Every colored cell uses the same dark foreground; check the legend colors remain readable.
const luminance = hex => {const c=hex.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
for(const band of EPISODE_RATING_BANDS) assert.ok((luminance(band.color)+.05)/(luminance('#111111')+.05)>=4.5,band.label);
console.log('PASS all rating colors meet 4.5:1 text contrast');
