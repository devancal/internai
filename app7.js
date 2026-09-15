// Targeted Discover enhancements: regional close-to-home results + universal job import.
function locationTier(job){
  const pref=(state.profile.workPreference||'');
  if(pref!=='close-home')return 1;
  const home=(state.profile.location||'').toLowerCase();
  const jl=(job.location||'').toLowerCase();
  if(!home)return 1;
  if(job.mode==='Remote')return .62;
  const city=home.split(',')[0].trim();
  const stateCode=(home.match(/,\s*([a-z]{2})\b/i)||[])[1]?.toLowerCase();
  if(city&&jl.includes(city))return 1;
  if(stateCode&&new RegExp(`,\\s*${stateCode}\\b`,'i').test(jl))return .86;
  const nearby={oh:['pittsburgh','detroit','erie'],pa:['cleveland','youngstown'],mi:['toledo','cleveland','south bend']}[stateCode]||[];
  if(nearby.some(x=>jl.includes(x)))return .58;
  return .12;
}
function effectiveLocationFilter(){return (jobFilters.location||'').trim()}
function filteredJobs(){
  if(jobFilters.semester===undefined)jobFilters.semester='Summer';
  const q=jobFilters.query.trim().toLowerCase(),loc=effectiveLocationFilter().toLowerCase();
  return jobsData.filter(j=>{
    if(jobFilters.saved&&!state.saved.includes(j.id))return false;
    if(jobFilters.mode!=='all'&&j.mode!==jobFilters.mode)return false;
    if(jobFilters.semester==='Unspecified'&&!(j.season||['Unspecified']).includes('Unspecified'))return false;
    if(jobFilters.semester!=='all'&&jobFilters.semester!=='Unspecified'&&!(j.season||[]).includes(jobFilters.semester))return false;
    if(loc&&!j.location.toLowerCase().includes(loc.split(',')[0]))return false;
    if(q&&!`${j.title} ${j.company} ${j.location} ${(j.skills||[]).join(' ')} ${j.desc||''} ${(j.degreeFields||[]).join(' ')}`.toLowerCase().includes(q))return false;
    if(!q&&!disciplineFitsProfile(j))return false;
    if(!loc&&state.profile.workPreference==='close-home'&&locationTier(j)<.5)return false;
    return true;
  });
}
const _matchBreakdown=matchBreakdown;
matchBreakdown=function(job){const b=_matchBreakdown(job);if(state.profile.workPreference==='close-home'){b.location=locationTier(job);b.score=Math.min(96,Math.max(5,Math.round(b.field*35+b.skills*30+b.location*20+b.term*15)))}return b};
match=function(job){return matchBreakdown(job).score};
function inferImportedSeason(text=''){const s=[],t=text.toLowerCase();if(/\bspring\b/.test(t))s.push('Spring');if(/\bsummer\b/.test(t))s.push('Summer');if(/\bfall\b|\bautumn\b/.test(t))s.push('Fall');if(/\bwinter\b/.test(t))s.push('Winter');return s.length?s:['Unspecified']}
function inferImportedSkills(text=''){const rules=[['SolidWorks',/solid\s?works/i],['Onshape',/onshape/i],['CAD',/\bcad\b|autocad|inventor/i],['Python',/\bpython\b/i],['Excel',/\bexcel\b/i],['GD&T',/gd&t|geometric dimension/i],['Manufacturing',/manufactur/i],['Testing',/\btest(?:ing)?\b|validation|verification/i],['Mechanical Design',/mechanical design|machine design/i],['Thermodynamics',/thermodynamic|heat transfer/i]];return rules.filter(([,r])=>r.test(text)).map(([n])=>n)}
function inferImportedDegrees(text=''){const rules=[['Mechanical',/mechanical engineering/i],['Aerospace',/aerospace|aeronautical engineering/i],['Manufacturing',/manufacturing engineering/i],['Industrial',/industrial engineering/i],['Electrical',/electrical engineering/i],['Computer',/computer engineering/i],['Software',/software engineering|computer science/i],['Chemical',/chemical engineering/i],['Civil',/civil engineering/i]];return rules.filter(([,r])=>r.test(text)).map(([n])=>n)}
function importJob(){
  document.getElementById('page').innerHTML=`<div class="page-title"><div><button class="btn outline small" onclick="jobs()">← Discover</button><h1 style="margin-top:12px">Import any internship</h1><p>Found a role on Handshake, LinkedIn, Workday, or a company site? Bring it into InternAI and prepare the application here.</p></div></div>
  <div class="import-hero"><div><b>Find anywhere. Apply with InternAI.</b><p>Paste the posting details below. InternAI will identify useful job signals, calculate your match, and create an Application Workspace.</p></div><span class="status">No account connection required</span></div>
  <div class="panel"><h3>Job posting</h3><div class="form-grid">
    <div class="field" style="grid-column:1/-1"><label>Job URL</label><input id="importUrl" type="url" placeholder="https://..." oninput="updateImportSource(this.value)"><div id="importSource" class="meta" style="margin-top:6px">Paste the original posting URL.</div></div>
    <div class="field"><label>Job title</label><input id="importTitle" placeholder="Mechanical Engineering Intern"></div>
    <div class="field"><label>Company</label><input id="importCompany" placeholder="Company name"></div>
    <div class="field" style="grid-column:1/-1"><label>Location</label><input id="importLocation" placeholder="Cleveland, OH · Hybrid · Remote"></div>
    <div class="field" style="grid-column:1/-1"><label>Job description / requirements</label><textarea id="importDesc" style="min-height:250px" placeholder="Paste the posting description here. More detail gives InternAI better matching and tailoring context."></textarea><div class="meta" style="margin-top:6px">InternAI only uses what you provide here; it does not pretend it can access private Handshake pages.</div></div>
  </div><div class="row" style="margin-top:18px"><button class="btn dark" onclick="createImportedWorkspace()">Analyze & create workspace →</button><button class="btn outline" onclick="jobs()">Cancel</button></div></div>`;
}
function updateImportSource(value){const el=document.getElementById('importSource');if(!el)return;try{const u=new URL(value);el.textContent=`Source: ${u.hostname.replace(/^www\./,'')}`}catch{el.textContent=value?'Enter a complete URL including https://':'Paste the original posting URL.'}}
function createImportedWorkspace(){
  const url=document.getElementById('importUrl')?.value.trim(),title=document.getElementById('importTitle')?.value.trim(),company=document.getElementById('importCompany')?.value.trim(),location=document.getElementById('importLocation')?.value.trim()||'Location not listed',desc=document.getElementById('importDesc')?.value.trim()||'Imported by you. Open the original posting for full details.';
  let parsed;try{parsed=new URL(url)}catch{return toast('Add a valid job URL first')}if(!title)return toast('Add the job title');if(!company)return toast('Add the company');
  const full=`${title} ${company} ${location} ${desc}`,id=`import-${Date.now()}`;
  const imported={id,title,company,location,mode:/remote/i.test(location)?'Remote':/hybrid/i.test(location)?'Hybrid':'On-site',season:inferImportedSeason(full),skills:inferImportedSkills(full),degreeFields:inferImportedDegrees(full),preferred:[],deadline:'Not listed',source:`Imported · ${parsed.hostname.replace(/^www\./,'')}`,applyUrl:url,desc,live:false,imported:true};
  jobsData=[imported,...jobsData];state.importedJobs=state.importedJobs||[];state.importedJobs.unshift(imported);const app=ensureApplication(imported);app.status='Preparing';app.source='Imported';persist();toast('Job analyzed — workspace created');openPrep(app.id);
}
const _loadLiveJobs=loadLiveJobs;
loadLiveJobs=async function(force=false){await _loadLiveJobs(force);const imported=state.importedJobs||[];if(imported.length){const ids=new Set(jobsData.map(j=>j.id));jobsData=[...imported.filter(j=>!ids.has(j.id)),...jobsData];if(state.page==='jobs')jobs()}};
const _jobs=jobs;
jobs=function(){_jobs();const page=document.getElementById('page'),title=page?.querySelector('.page-title');if(title&&!document.getElementById('importJobBtn')){const btn=document.createElement('button');btn.id='importJobBtn';btn.className='btn dark small';btn.textContent='+ Import any job';btn.onclick=importJob;const refresh=title.querySelector('button');if(refresh)refresh.before(btn);else title.appendChild(btn)}const notice=page?.querySelector('.panel .notice');if(notice&&state.profile.workPreference==='close-home')notice.innerHTML=`<b>Using your profile by default:</b> ${esc(profileFieldDefault()||'Field not set')} · ${esc(profileLocationDefault()||'Location not set')} · ${esc(profileWorkPreferenceLabel())}. Close to home searches your home city first, then your state and nearby regional cities. You can also import any internship you find elsewhere and prepare the application in InternAI.`};
