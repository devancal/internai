const test=require('node:test'),assert=require('node:assert/strict');
const {runtime}=require('./runtime.cjs');
test('failed refresh retains each successful feed with its original freshness date',async()=>{
 const r=runtime();r.run('jobs=dashboard=()=>{}');
 r.ctx.fetch=async url=>({ok:true,json:async()=>({updatedAt:'2026-09-01T00:00:00Z',jobs:[{id:url,live:true,applyUrl:'https://example.com'+url}]})});
 await r.run('loadLiveJobs()');
 r.ctx.fetch=async()=>{throw Error('offline')};await r.run('loadLiveJobs(true)');
 assert.equal(r.run('jobsData.length'),2);assert.equal(r.run('jobsSource'),'live');
 assert.equal(r.run('jobsData.every(j=>j.fetchedAt==="2026-09-01T00:00:00Z")'),true);
 assert.match(r.run('feedStatusText()'),/Retaining older listings/);
});
test('recovered empty feed removes old jobs while an unavailable feed is retained',async()=>{
 const r=runtime();r.run('jobs=dashboard=()=>{}');
 r.ctx.fetch=async url=>({ok:true,json:async()=>({jobs:[{id:url,live:true,applyUrl:'https://example.com'+url}]})});
 await r.run('loadLiveJobs()');
 r.ctx.fetch=async url=>{if(url.includes('midwest'))throw Error('offline');return{ok:true,json:async()=>({jobs:[]})}};
 await r.run('loadLiveJobs(true)');assert.equal(r.run('jobsData.length'),1);assert.match(r.run('jobsData[0].id'),/midwest/);
 r.ctx.fetch=async()=>({ok:true,json:async()=>({jobs:[]})});await r.run('loadLiveJobs(true)');
 assert.equal(r.run('jobsSource'),'fallback');assert.doesNotMatch(r.run('feedStatusText()'),/Retaining older listings/);
});
