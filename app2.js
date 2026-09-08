function profileStrength(){const p=state.profile;let n=0;if(p.name.trim())n+=10;if(p.personalEmail.trim())n+=10;if(p.school.trim())n+=10;if(p.major.trim())n+=10;if(p.grad.trim())n+=10;if(p.location.trim())n+=10;if(p.workPreference)n+=10;if(p.summary.trim())n+=10;if(p.skills.length)n+=20;return Math.min(100,n)}
function refreshProfileCompletion(){const el=document.getElementById('profileCompleteBadge');if(el)el.textContent=profileStrength()+'% complete'}
function match(job){const p=state.profile;const s=new Set(p.skills.map(x=>x.toLowerCase()));const matched=job.skills.filter(x=>s.has(x.toLowerCase()));const skillPct=job.skills.length?matched.length/job.skills.length:0;const sameCity=!!(p.location&&job.location.toLowerCase().includes(p.location.toLowerCase().split(',')[0]));let loc=.65;switch(p.workPreference){case'remote':loc=job.mode==='Remote'?1:.2;break;case'close-home':loc=sameCity?1:(job.mode==='Remote'?.8:.25);break;case'hybrid':loc=job.mode==='Hybrid'?1:(job.mode==='Remote'?.65:.5);break;case'relocate':loc=job.mode==='Remote'?.75:1;break;default:loc=.75;}const base=p.skills.length?22:0;return Math.min(96,Math.round(base+skillPct*63+loc*11))}
function dashboard(){const ranked=jobsData.map(j=>({...j,score:match(j)})).sort((a,b)=>b.score-a.score);const active=state.apps.filter(a=>a.status!=='Rejected'&&a.status!=='Offer').length;document.getElementById('page').innerHTML=`<div class="page-title"><div><h1>Overview</h1><p>Your internship search at a glance.</p></div><button class="btn dark" onclick="showPage('jobs')">Discover roles →</button></div><div class="grid3"><div class="metric"><span>Profile strength</span><b>${profileStrength()}%</b></div><div class="metric"><span>Saved roles</span><b>${state.saved.length}</b></div><div class="metric"><span>Active applications</span><b>${active}</b></div></div>${profileStrength()<60?`<div class="panel"><div class="notice warn"><b>Improve your match quality.</b> Add your actual skills, school, location, and resume facts so scores are based on evidence instead of guesses. <button class="btn outline small" style="margin-left:8px" onclick="showPage('profile')">Complete profile</button></div></div>`:''}<div class="panel"><div class="row" style="justify-content:space-between"><h3>Best current matches</h3><span class="meta">${jobsSource==='live'?'Live employer listings':'Loading live roles…'}</span></div><div class="jobs">${ranked.slice(0,3).map(jobHtml).join('')}</div></div>`}
function jobHtml(j){
  const sc=j.score??match(j);
  const matched=j.skills.filter(x=>state.profile.skills.some(s=>s.toLowerCase()===x.toLowerCase()));
  return `<div class="job" onclick="openJob('${j.id}')" style="cursor:pointer">
    <div class="job-head"><div><h3>${esc(j.title)}</h3><div class="meta">${esc(j.company)} · ${esc(j.location)} · ${esc(j.mode)}</div></div><div class="score">${sc}%</div></div>
    <div class="tags">${j.skills.slice(0,6).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}${j.live?'<span class="tag">Live listing</span>':''}</div>
    <div class="why"><b>Why it fits:</b> ${matched.length?`Verified matches: ${matched.map(esc).join(', ')}.`:'No verified skill matches yet. Add real skills to improve this score.'}</div>
    <div class="job-actions"><button class="btn dark small" onclick="event.stopPropagation();openJob('${j.id}')">View match →</button><button class="btn outline small" onclick="event.stopPropagation();toggleSave('${j.id}')">${state.saved.includes(j.id)?'Saved ✓':'Save'}</button></div>
  </div>`;
}
function filteredJobs(){
  const q=jobFilters.query.trim().toLowerCase(),loc=jobFilters.location.trim().toLowerCase();
  return jobsData.filter(j=>{
    if(jobFilters.saved&&!state.saved.includes(j.id))return false;
    if(jobFilters.mode!=='all'&&j.mode!==jobFilters.mode)return false;
    if(loc&&!j.location.toLowerCase().includes(loc))return false;
    if(q&&!`${j.title} ${j.company} ${j.location} ${(j.skills||[]).join(' ')}`.toLowerCase().includes(q))return false;
    return true;
  });
}
function setJobFilter(key,value){jobFilters[key]=key==='saved'?!!value:value;jobs()}
function clearJobFilters(){jobFilters={query:'',location:'',mode:'all',saved:false};jobs()}
function jobs(){
  const ranked=filteredJobs().map(j=>({...j,score:match(j)})).sort((a,b)=>b.score-a.score);
  const sourceText=jobsSource==='live'?`${jobsData.length} live internships/co-ops from public employer job boards.`:'Loading live roles. Sample fallback listings are shown only if the live feed is unavailable.';
  document.getElementById('page').innerHTML=`<div class="page-title"><div><h1>Discover</h1><p>Evidence-based internship matches ranked against your verified profile.</p></div><button class="btn outline small" onclick="loadLiveJobs(true);toast('Refreshing live listings')">Refresh listings</button></div>
  <div class="notice"><b>${jobsSource==='live'?'Live listings':'Job feed status'}:</b> ${esc(sourceText)} Match explanations use only profile facts you entered.</div>
  <div class="panel" style="margin-top:16px"><div class="form-grid"><div class="field"><label>Search</label><input value="${esc(jobFilters.query)}" placeholder="Mechanical, aerospace, CAD…" oninput="jobFilters.query=this.value" onkeydown="if(event.key==='Enter')jobs()"></div><div class="field"><label>Location</label><input value="${esc(jobFilters.location)}" placeholder="Cleveland, Cincinnati, Remote…" oninput="jobFilters.location=this.value" onkeydown="if(event.key==='Enter')jobs()"></div><div class="field"><label>Work mode</label><select onchange="setJobFilter('mode',this.value)"><option value="all" ${jobFilters.mode==='all'?'selected':''}>Any</option><option ${jobFilters.mode==='On-site'?'selected':''}>On-site</option><option ${jobFilters.mode==='Hybrid'?'selected':''}>Hybrid</option><option ${jobFilters.mode==='Remote'?'selected':''}>Remote</option></select></div><div class="field"><label>Saved</label><select onchange="setJobFilter('saved',this.value==='saved')"><option value="all" ${!jobFilters.saved?'selected':''}>All roles</option><option value="saved" ${jobFilters.saved?'selected':''}>Saved only</option></select></div></div><div class="row" style="margin-top:12px"><button class="btn dark small" onclick="jobs()">Apply filters</button><button class="btn outline small" onclick="clearJobFilters()">Clear</button><span class="meta">${ranked.length} result${ranked.length===1?'':'s'}</span></div></div>
  <div class="jobs" style="margin-top:16px">${ranked.length?ranked.map(jobHtml).join(''):'<div class="panel empty">No roles match those filters.</div>'}</div>`;
}
function toggleSave(id){
  state.saved.includes(id)?state.saved=state.saved.filter(x=>x!==id):state.saved.push(id);
  persist();toast(state.saved.includes(id)?'Role saved':'Removed from saved');
  if(state.page==='jobs')jobs();
}
function jobEvidence(j){
  const skills=state.profile.skills.map(x=>x.toLowerCase());
  const matched=j.skills.filter(x=>skills.includes(x.toLowerCase()));
  const missing=j.skills.filter(x=>!skills.includes(x.toLowerCase()));
  const preferred=(j.preferred||[]).filter(x=>!skills.includes(x.toLowerCase()));
  return {matched,missing,preferred};
}
function openJob(id){
  const j=getJobById(id); if(!j)return;
  const e=jobEvidence(j), sc=match(j);
  const existing=state.apps.find(a=>a.jobId===id);
  document.getElementById('page').innerHTML=`<div class="page-title"><div><button class="btn outline small" onclick="jobs()">← Discover</button><h1 style="margin-top:12px">${esc(j.title)}</h1><p>${esc(j.company)} · ${esc(j.location)} · ${esc(j.mode)}</p></div><div class="score" style="font-size:18px">${sc}% match</div></div>
  <div class="flow-steps"><span class="flow-step active">1 Match</span><span class="flow-step">2 Application Kit</span><span class="flow-step">3 Apply</span><span class="flow-step">4 Track</span></div>
  <div class="match-grid">
    <div>
      <div class="panel"><h3>About this role</h3><p style="color:var(--muted);line-height:1.7">${esc(j.desc)}</p><div class="tags"><span class="tag">${esc(j.source)}</span><span class="tag">${j.deadline?`Deadline: ${esc(j.deadline)}`:'Deadline not listed'}</span>${j.live?'<span class="tag">Live employer listing</span>':''}</div></div>
      <div class="panel"><h3>Why you match</h3><div class="match-list">
        ${e.matched.length?e.matched.map(x=>`<div class="match-row"><span class="match-icon yes">✓</span><div><b>${esc(x)}</b><div class="meta">Verified in your profile</div></div></div>`).join(''):`<div class="notice warn">No listed skills on this role are verified in your profile yet.</div>`}
      </div></div>
    </div>
    <div>
      <div class="panel"><h3>What may be missing</h3><div class="match-list">
        ${e.missing.map(x=>`<div class="match-row"><span class="match-icon no">!</span><div><b>${esc(x)}</b><div class="meta">Not currently verified — InternAI will not claim you have it.</div></div></div>`).join('')||'<div class="notice">All listed core skills are represented in your profile.</div>'}
        ${e.preferred.map(x=>`<div class="match-row"><span class="match-icon no">+</span><div><b>${esc(x)}</b><div class="meta">Preferred in this role; not currently verified.</div></div></div>`).join('')}
      </div></div>
      <div class="panel"><h3>Next step</h3><p class="meta">Prepare truthful application materials from your verified profile. You review everything before applying.</p><button class="btn dark" style="width:100%;margin-top:12px" onclick="prepareJob('${id}')">${existing?'Open application workspace':'Prepare application →'}</button></div>
    </div>
  </div>`;
}
