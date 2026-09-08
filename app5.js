function generateDraft(a){const p=state.profile;const skills=p.skills.slice(0,5);return `Dear ${a.company} Hiring Team,\n\nI am interested in the ${a.title} opportunity. ${p.school?`I am studying ${p.major||'engineering'} at ${p.school}${p.grad?`, with an expected graduation of ${p.grad}`:''}. `:''}${skills.length?`My verified skills include ${skills.join(', ')}. `:''}${p.summary?p.summary+' ':''}\n\nI would welcome the opportunity to discuss how my background aligns with the role.\n\nSincerely,\n${p.name||'[Your name]'}`}
function saveApp(id){const a=state.apps.find(x=>x.id===id);a.status=document.getElementById('astatus').value;a.notes=document.getElementById('anotes').value;persist();toast('Application saved')}
function saveDraft(id){const a=state.apps.find(x=>x.id===id);a.draft=document.getElementById('adraft').value;persist();toast('Draft saved')}
function regenerate(id){const a=state.apps.find(x=>x.id===id);document.getElementById('adraft').value=generateDraft(a)}

function filteredSuggestions(list,value){
  const q=(value||'').trim().toLowerCase();
  if(!q) return [];
  return list.filter(v=>v.toLowerCase().includes(q)).slice(0,8);
}
function getSuggestionList(key){
  if(key==='school') return schoolSuggestions;
  if(key==='major') return majorSuggestions;
  if(key==='grad') return gradSuggestions;
  if(key==='location') return locationSuggestions;
  return [];
}
function suggestionField(id,label,value,placeholder,key){
  return `<div class="field"><label>${label}</label><div class="suggest-wrap"><input id="${id}" autocomplete="off" value="${esc(value||'')}" placeholder="${esc(placeholder)}" oninput="handleSuggestInput('${id}','${key}',this.value)" onfocus="handleSuggestInput('${id}','${key}',this.value)" onblur="setTimeout(()=>hideSuggest('${id}'),120)"><div id="${id}Menu" class="suggest-menu hidden"></div></div></div>`;
}
function handleSuggestInput(id,key,value){
  autoSaveProfileField(key,value);
  const menu=document.getElementById(id+'Menu');
  if(!menu) return;
  const q=(value||'').trim();
  if(!q){menu.innerHTML='';menu.classList.add('hidden');return;}
  const matches=filteredSuggestions(getSuggestionList(key),q);
  if(!matches.length){
    menu.innerHTML='<div class="suggest-empty">No suggestions — keep typing your own value.</div>';
    menu.classList.remove('hidden');
    return;
  }
  menu.innerHTML=matches.map(v=>`<button type="button" class="suggest-item" onmousedown="event.preventDefault()" onclick='chooseSuggestion(${JSON.stringify(id)},${JSON.stringify(key)},${JSON.stringify(v)})'>${esc(v)}</button>`).join('');
  menu.classList.remove('hidden');
}
function chooseSuggestion(id,key,value){
  const input=document.getElementById(id);
  if(input) input.value=value;
  autoSaveProfileField(key,value);
  hideSuggest(id);
}
function hideSuggest(id){
  const menu=document.getElementById(id+'Menu');
  if(menu) menu.classList.add('hidden');
}
function profile(){const p=state.profile;document.getElementById('page').innerHTML=`<div class="page-title"><div><h1>Candidate profile</h1><p>Only add facts you can stand behind.</p></div><span id="profileCompleteBadge" class="status">${profileStrength()}% complete</span></div><div class="panel"><h3>Basics</h3><div class="notice">Your profile auto-saves in this browser. Start typing in School, Major, Expected graduation, or Location. Choose a suggestion if it matches, or keep typing your own value.</div><div class="form-grid" style="margin-top:14px"><div class="field"><label>Full name</label><input id="pname" value="${esc(p.name)}" oninput="autoSaveProfileField('name',this.value)"></div><div class="field"><label>Personal email <span style="font-weight:400;color:#8a948e">(recommended)</span></label><input id="ppersonalEmail" type="email" value="${esc(p.personalEmail||'')}" placeholder="you@gmail.com" oninput="autoSaveProfileField('personalEmail',this.value)"></div><div class="field"><label>School email <span style="font-weight:400;color:#8a948e">(optional)</span></label><input id="pschoolEmail" type="email" value="${esc(p.schoolEmail||'')}" placeholder="you@school.edu" oninput="autoSaveProfileField('schoolEmail',this.value)"></div>${suggestionField('pschool','School',p.school,'Start typing school','school')}${suggestionField('pmajor','Major',p.major,'Start typing major','major')}${suggestionField('pgrad','Expected graduation',p.grad,'Start typing graduation date','grad')}${suggestionField('plocation','Location',p.location,'Start typing location','location')}<div class="field"><label>Where do you want to work?</label><select id="pworkPreference" onchange="autoSaveProfileField('workPreference',this.value);toast('Work preference saved')"><option value="" ${!p.workPreference?'selected':''} disabled>Select work preference</option><option value="close-home" ${p.workPreference==='close-home'?'selected':''}>Close to home</option><option value="remote" ${p.workPreference==='remote'?'selected':''}>Remote</option><option value="hybrid" ${p.workPreference==='hybrid'?'selected':''}>Hybrid preferred</option><option value="relocate" ${p.workPreference==='relocate'?'selected':''}>Open to relocate</option><option value="doesnt-matter" ${p.workPreference==='doesnt-matter'?'selected':''}>Doesn’t matter</option></select><div class="meta" style="margin-top:6px">Used when ranking internship matches.</div></div><div class="field"><label>GPA (optional)</label><input id="pgpa" value="${esc(p.gpa)}" oninput="autoSaveProfileField('gpa',this.value)"></div></div><div class="field" style="margin-top:13px"><div class="row" style="justify-content:space-between;align-items:center"><label style="margin:0">Professional summary</label>${p.resumeText?`<button type="button" class="btn outline small" onclick="replaceSummaryFromResume()">Generate from resume</button>`:''}</div><textarea id="psummary" oninput="autoSaveProfileField('summary',this.value)" placeholder="Upload a resume and InternAI will create this for you.">${esc(p.summary)}</textarea><div class="meta" style="margin-top:6px">When your summary is blank, uploading a resume fills this automatically. You can regenerate it anytime.</div></div><div class="meta" id="saveState" style="margin-top:9px">Saved locally</div></div><div class="panel"><h3>Verified skills</h3><div class="row"><input id="skillInput" placeholder="e.g. SolidWorks" style="flex:1;border:1px solid #d7e1d9;border-radius:11px;padding:11px"><button type="button" class="btn dark" onclick="addSkill()">Add skill</button></div><div id="skillsList" class="skills" style="margin-top:12px">${skillsHtml()}</div></div><div class="panel"><h3>Resume upload & fact review</h3><div class="notice">Upload a text-based PDF resume. InternAI reads it in your browser, proposes facts it can identify, and waits for you to approve them before they become profile data.</div><div class="resume-box" style="margin-top:13px"><input id="resumeFile" type="file" accept=".pdf,application/pdf" onchange="parseResumeFile(this.files[0])"><div class="meta" style="margin-top:9px">${p.resumeFilename?`Last analyzed: ${esc(p.resumeFilename)}`:'PDF only · Nothing is added automatically.'}</div></div><div id="resumeResult" style="margin-top:12px"></div></div>`;if(p.resumeText)renderResumeFacts(p.resumeText)}
