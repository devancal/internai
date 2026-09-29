// One bounded refresh shares both feeds and preserves honest source diagnostics.
let internFeedPromise=null;
const internFeedCache=new Map();
let feedStatus={checkedAt:null,sources:[],loading:false};
function feedStatusText(){
 if(feedStatus.loading)return 'Refreshing employer feeds…';
 if(!feedStatus.checkedAt)return 'Employer feeds have not finished loading.';
 const failures=feedStatus.sources.filter(s=>!s.ok||s.partial);
 const count=jobsData.filter(j=>j.live).length;
 const time=new Date(feedStatus.checkedAt).toLocaleString();
 const stale=feedStatus.sources.filter(s=>s.stale).map(s=>`${s.label} (last successful fetch: ${new Date(s.updatedAt).toLocaleString()})`);
 return `${count} employer listings. Last refresh attempt: ${time}.${failures.length?` Some sources are unavailable: ${failures.map(s=>s.label).join(', ')}. Results may be incomplete.`:''}${stale.length?` Retaining older listings from ${stale.join(', ')}; availability has not been rechecked.`:''}${jobsSource==='fallback'?' Showing illustrative samples because no live listings were returned.':''}`;
}
function canonicalJobUrl(value){try{const u=new URL(value);u.hash='';for(const key of ['utm_source','utm_medium','utm_campaign','gh_src','source'])u.searchParams.delete(key);return u.href.replace(/\/$/,'')}catch{return ''}}
loadLiveJobs=function(force=false){
 if(internFeedPromise)return internFeedPromise;
 if(!force&&jobsLoaded)return Promise.resolve();
 jobsLoading=true;feedStatus.loading=true;
 internFeedPromise=(async()=>{
  const feeds=[['Core employer boards','/api/jobs-v2'],['Midwest employer boards','/api/midwest-jobs']];
  const results=await Promise.all(feeds.map(async([label,path])=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
   try{
    const response=await fetch(path+(force?`?t=${Date.now()}`:''),{headers:{accept:'application/json'},cache:force?'no-store':'default',signal:controller.signal});
    if(!response.ok)throw new Error('feed unavailable');
    const data=await response.json();if(!Array.isArray(data.jobs))throw new Error('invalid feed');
    const fetchedAt=Number.isFinite(Date.parse(data.updatedAt))?data.updatedAt:new Date().toISOString();
    const result={label,ok:true,partial:!!data.partial,updatedAt:fetchedAt,jobs:data.jobs.map(j=>({...j,fetchedAt}))};
    internFeedCache.set(path,result);return result;
   }catch{const previous=internFeedCache.get(path);return {label,ok:false,partial:false,stale:!!previous?.jobs.length,updatedAt:previous?.updatedAt||null,jobs:previous?.jobs||[]}}finally{clearTimeout(timer)}
  }));
  const byUrl=new Map();for(const j of results.flatMap(r=>r.jobs)){const key=canonicalJobUrl(j.applyUrl)||j.id;if(!byUrl.has(key))byUrl.set(key,j)}
  const live=[...byUrl.values()];jobsSource=live.length?'live':'fallback';
  jobsData=[...(state.importedJobs||[]),...(live.length?live:seedJobs)];
  feedStatus={checkedAt:new Date().toISOString(),loading:false,sources:results.map(({jobs,...status})=>({...status,count:jobs.length}))};
  if(results.some(r=>!r.ok||r.partial))recordDiagnostic('feed_partial');jobsLoaded=true;
 })().finally(()=>{jobsLoading=false;feedStatus.loading=false;internFeedPromise=null;if(internActiveView==='jobs')jobs();else if(internActiveView==='dashboard')dashboard()});
 return internFeedPromise;
};
