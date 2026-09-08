function toggleKitMaterial(id){document.getElementById(id)?.classList.toggle('open')}
function setKitMaterialOpen(id,open){const el=document.getElementById(id);if(el)el.classList.toggle('open',!!open)}
function selectKitChoice(appId,type,value,detailId){
  const a=state.apps.find(x=>x.id===appId);if(!a)return;
  a.kitChoices={...(a.kitChoices||{}),[type]:value};
  persist();
  const group=document.querySelector(`[data-kit-choice-group="${type}"]`);
  if(group){group.querySelectorAll('[data-kit-choice]').forEach(btn=>{const selected=btn.getAttribute('data-kit-choice')===value;btn.classList.toggle('dark',selected);btn.classList.toggle('outline',!selected);btn.setAttribute('aria-pressed',selected?'true':'false');const label=btn.getAttribute('data-label')||btn.textContent.replace(/^✓\s*/, '');btn.setAttribute('data-label',label);btn.textContent=(selected?'✓ ':'')+label;});}
  const open=(type==='resume'&&value==='tailored')||(type==='cover'&&value==='generate')||(type==='answers'&&value==='prepare');
  if(detailId)setKitMaterialOpen(detailId,open);
  const messages={tailored:'Tailored resume selected',original:'Original resume selected',generate:'Cover letter selected',skipCover:'Cover letter skipped',prepare:'Application answers selected',skipAnswers:'Application answers skipped'};
  toast(messages[value]||'Choice saved');
}
function toggleKitEditor(previewId,inputId){
  const preview=document.getElementById(previewId),input=document.getElementById(inputId);if(!preview||!input)return;
  if(input.style.display==='none'){input.style.display='block';preview.style.display='none';input.focus()}
  else{preview.textContent=input.value;input.style.display='none';preview.style.display='block'}
}
function copyKitText(id){
  const el=document.getElementById(id);if(!el)return;
  if(navigator.clipboard)navigator.clipboard.writeText(el.textContent||'');
  toast('Copied');
}
function savePrep(id){
  const a=state.apps.find(x=>x.id===id);if(!a)return;
  const rn=document.getElementById('resumeNotes'),cd=document.getElementById('coverDraft'),ad=document.getElementById('answerDraft');if(rn)a.resumeNotes=rn.value;if(cd)a.draft=cd.value;if(ad)a.answers=ad.value;
  persist();toast('Application preparation saved');
}
function readyToApply(id){savePrep(id);const a=state.apps.find(x=>x.id===id);a.status='Ready';persist();openApplyStep(id)}
function openApplyStep(id){
  const a=state.apps.find(x=>x.id===id),j=getJobById(a?.jobId);if(!a||!j)return;
  document.getElementById('page').innerHTML=`<div class="page-title"><div><button class="btn outline small" onclick="openPrep('${id}')">← Application Kit</button><h1 style="margin-top:12px">Ready to apply</h1><p>${esc(j.company)} · ${esc(j.title)}</p></div></div>
  <div class="flow-steps"><span class="flow-step">1 Match</span><span class="flow-step">2 Application Kit</span><span class="flow-step active">3 Apply</span><span class="flow-step">4 Track</span></div>
  <div class="apply-box"><h3>Final submission stays with you.</h3><p style="color:var(--muted);line-height:1.7">${j.live?'This role came from the employer’s public job board. InternAI opens the original application page in a new tab so you can review and submit it yourself.':'This fallback sample role does not have a real employer application attached.'}</p>
  <div class="row" style="margin-top:14px"><button class="btn dark" onclick="openExternalApply('${id}')">Open application site ↗</button><button class="btn outline" onclick="confirmSubmitted('${id}')">I submitted it ✓</button></div></div>`;
}
function openExternalApply(id){const a=state.apps.find(x=>x.id===id),j=getJobById(a?.jobId);if(!j)return;if(j.live&&/^https:\/\//i.test(j.applyUrl||'')){window.open(j.applyUrl,'_blank','noopener,noreferrer');return}toast('No verified employer URL is attached to this fallback sample role')}
function confirmSubmitted(id){
  const a=state.apps.find(x=>x.id===id);if(!a)return;a.status='Applied';a.submittedAt=new Date().toISOString().slice(0,10);persist();toast('Marked as applied');openApplication(id);
}
function applyJob(id){openJob(id)}
function applications(){document.getElementById('page').innerHTML=`<div class="page-title"><div><h1>Applications</h1><p>Track each role and keep your preparation together.</p></div><button class="btn dark" onclick="manualApp()">+ Add application</button></div>${state.apps.length?`<div class="panel" style="padding:0 18px"><table class="table"><thead><tr><th>Company</th><th>Role</th><th>Status</th><th>Started</th><th></th></tr></thead><tbody>${state.apps.map(a=>`<tr><td>${esc(a.company)}</td><td>${esc(a.title)}</td><td><select onchange="updateStatus('${a.id}',this.value)" style="border:0;background:#edf6ef;border-radius:999px;padding:6px 8px;color:#21673a"><option ${a.status==='Interested'?'selected':''}>Interested</option><option ${a.status==='Preparing'?'selected':''}>Preparing</option><option ${a.status==='Ready'?'selected':''}>Ready</option><option ${a.status==='Applied'?'selected':''}>Applied</option><option ${a.status==='Interview'?'selected':''}>Interview</option><option ${a.status==='Offer'?'selected':''}>Offer</option><option ${a.status==='Rejected'?'selected':''}>Rejected</option></select></td><td>${esc(a.date)}</td><td><button class="btn outline small" onclick="${a.jobId?`openPrep('${a.id}')`:`openApplication('${a.id}')`}">Open</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="panel empty">No applications yet. Discover a role or add one manually.</div>`}`}
function manualApp(){const company=prompt('Company name?');if(!company)return;const title=prompt('Role title?');if(!title)return;state.apps.unshift({id:crypto.randomUUID(),company,title,status:'Interested',date:new Date().toISOString().slice(0,10),notes:'',draft:''});persist();applications()}
function updateStatus(id,status){const a=state.apps.find(x=>x.id===id);a.status=status;persist();toast('Status updated')}
function openApplication(id){const a=state.apps.find(x=>x.id===id);document.getElementById('page').innerHTML=`<div class="page-title"><div><h1>${esc(a.title)}</h1><p>${esc(a.company)} · application workspace</p></div><button class="btn outline" onclick="applications()">← Back</button></div><div class="panel"><div class="form-grid"><div class="field"><label>Status</label><select id="astatus"><option ${a.status==='Interested'?'selected':''}>Interested</option><option ${a.status==='Preparing'?'selected':''}>Preparing</option><option ${a.status==='Ready'?'selected':''}>Ready</option><option ${a.status==='Applied'?'selected':''}>Applied</option><option ${a.status==='Interview'?'selected':''}>Interview</option><option ${a.status==='Offer'?'selected':''}>Offer</option><option ${a.status==='Rejected'?'selected':''}>Rejected</option></select></div><div class="field"><label>Started</label><input value="${esc(a.date)}" disabled></div></div><div class="field" style="margin-top:13px"><label>Notes</label><textarea id="anotes">${esc(a.notes||'')}</textarea></div><button class="btn dark" onclick="saveApp('${id}')">Save application</button></div><div class="panel"><h3>Truth-first application assistant</h3><div class="notice">Drafts use only facts currently stored in your profile. InternAI will not invent missing experience, skills, GPA, metrics, or achievements.</div><div class="field" style="margin-top:14px"><label>Editable draft</label><textarea id="adraft" style="min-height:210px">${esc(a.draft||generateDraft(a))}</textarea></div><div class="row"><button class="btn dark" onclick="saveDraft('${id}')">Save draft</button><button class="btn outline" onclick="regenerate('${id}')">Regenerate from profile</button></div></div>`}
