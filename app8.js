// Discovery 2.3: merge Midwest feeds, with one bounded refresh in flight.
const _loadAllEmployerJobs=loadLiveJobs;
let internFeedPromise=null;
loadLiveJobs=function(force=false){
 if(internFeedPromise)return internFeedPromise;
 if(!force&&jobsLoaded)return Promise.resolve();
 internFeedPromise=(async()=>{
  await _loadAllEmployerJobs(force);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
  try{
   const r=await fetch(`/api/midwest-jobs${force?`?t=${Date.now()}`:''}`,{cache:force?'no-store':'default',signal:controller.signal});
   if(!r.ok)throw new Error(`Midwest feed ${r.status}`);
   const d=await r.json(),extra=Array.isArray(d.jobs)?d.jobs:[];
   if(extra.length){
    // Samples must never be presented as part of a live employer feed.
    const merged=[...extra,...jobsData.filter(j=>j.source!=='Sample fallback')],byUrl=new Map();
    for(const j of merged){const key=j.applyUrl||j.id;if(!byUrl.has(key))byUrl.set(key,j)}
    jobsData=[...byUrl.values()];jobsSource='live';
    if(state.page==='jobs')jobs();else if(state.page==='dashboard')dashboard();
   }
  }catch(e){console.warn('Midwest employer feed unavailable; core discovery feed remains active.')}
  finally{clearTimeout(timer)}
 })().finally(()=>{internFeedPromise=null});
 return internFeedPromise;
};
