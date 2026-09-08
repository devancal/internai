function autoSaveProfileField(key,value){state.profile[key]=value;persist();refreshProfileCompletion();const el=document.getElementById('saveState');if(el){el.textContent='Saved locally ✓';clearTimeout(window.__saveLabelTimer);window.__saveLabelTimer=setTimeout(()=>{if(el)el.textContent='Saved locally'},900)}}
function saveProfile(){['name','personalEmail','schoolEmail','school','major','grad','location','gpa','summary'].forEach(k=>{const map={name:'pname',personalEmail:'ppersonalEmail',schoolEmail:'pschoolEmail',school:'pschool',major:'pmajor',grad:'pgrad',location:'plocation',gpa:'pgpa',summary:'psummary'};const el=document.getElementById(map[k]);if(el)state.profile[k]=el.value.trim()});const wp=document.getElementById('pworkPreference');if(wp)state.profile.workPreference=wp.value;persist();refreshProfileCompletion();toast('Profile saved')}
function skillsHtml(){const p=state.profile;return p.skills.map((s,i)=>`<span class="skill">${esc(s)} <button type="button" onclick="removeSkill(${i})" style="border:0;background:transparent;color:#3d6647">×</button></span>`).join('')||'<span class="meta">No skills added yet.</span>'}
function refreshSkills(){const el=document.getElementById('skillsList');if(el)el.innerHTML=skillsHtml();refreshProfileCompletion()}
function addSkill(){const el=document.getElementById('skillInput'),v=el.value.trim();if(v&&!state.profile.skills.some(s=>s.toLowerCase()===v.toLowerCase()))state.profile.skills.push(v);persist();if(el)el.value='';refreshSkills();removeAcceptedResumeSkill(v);toast(v?'Skill saved':'Enter a skill')}
function removeSkill(i){state.profile.skills.splice(i,1);persist();refreshSkills()}
const skillDictionary=['SolidWorks','Onshape','CAD','Python','JavaScript','Excel','Mechanical Design','Mechanical Systems','Thermodynamics','Data Analysis','Process Optimization','Project Management','Team Collaboration','Prototyping','GD&T','Systems Engineering'];
async function parseResumeFile(file){if(!file)return;if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')){toast('Please choose a PDF resume');return}const result=document.getElementById('resumeResult');result.innerHTML='<div class="notice">Reading PDF…</div>';try{if(!window.pdfjsLib)throw new Error('PDF reader failed to load.');pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';const data=await file.arrayBuffer();const pdf=await pdfjsLib.getDocument({data}).promise;let txt='';for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();txt+=' '+content.items.map(x=>x.str||'').join(' ')}state.profile.resumeText=txt;state.profile.resumeFilename=file.name;persist();renderResumeFacts(txt)}catch(err){result.innerHTML=`<div class="notice warn">Could not read this PDF. Make sure it contains selectable text rather than only scanned images. ${esc(err?.message||'')}</div>`}}
function buildResumeSummary(txt,school,major,grad,skills){
  const lower=(txt||'').toLowerCase();
  const hasEngineering=/engineering|engineer/.test(lower);
  const hasProjects=/project|design|develop|build|fabricat|model/.test(lower);
  const hasLeadership=/coach|lead|mentor|leadership/.test(lower);
  const degree=major||(hasEngineering?'engineering':'');
  let first='';
  if(degree&&school) first=`${degree} student at ${school}${grad?` with an expected graduation of ${grad}`:''}.`;
  else if(degree) first=`${degree} student${grad?` with an expected graduation of ${grad}`:''}.`;
  else if(school) first=`Student at ${school}${grad?` with an expected graduation of ${grad}`:''}.`;
  else first='Engineering-focused student with hands-on technical experience documented in the uploaded resume.';
  const top=skills.slice(0,5);
  let second=top.length?`Technical background includes ${top.join(', ')}.`:'';
  let third='';
  if(hasProjects&&hasLeadership) third='Brings project-based technical experience along with demonstrated leadership and collaboration.';
  else if(hasProjects) third='Brings hands-on, project-based technical experience with a focus on practical problem solving and design.';
  else if(hasLeadership) third='Brings demonstrated leadership, teamwork, and problem-solving experience.';
  return [first,second,third].filter(Boolean).join(' ');
}
function renderResumeFacts(txt){
  const lower=txt.toLowerCase();
  const allSkillsFound=skillDictionary.filter(s=>lower.includes(s.toLowerCase()));
  const skillsFound=allSkillsFound.filter(s=>!state.profile.skills.some(x=>x.toLowerCase()===s.toLowerCase()));
  const school=schoolSuggestions.find(v=>lower.includes(v.toLowerCase()))||'';
  const major=majorSuggestions.find(v=>lower.includes(v.toLowerCase()))||'';
  const grad=(txt.match(/\b(?:May|August|December|Spring|Fall)\s+20\d{2}\b/i)||[])[0]||'';
  const location=locationSuggestions.find(v=>lower.includes(v.toLowerCase()))||'';
  const facts=[['school',school,'School'],['major',major,'Major'],['grad',grad,'Graduation'],['location',location,'Location']].filter(x=>x[1]&&state.profile[x[0]]!==x[1]);
  const summary=buildResumeSummary(txt,major&&school?school:(state.profile.school||school),major||state.profile.major,grad||state.profile.grad,allSkillsFound.length?allSkillsFound:state.profile.skills);
  const showSummary=summary&&summary.trim()!==state.profile.summary.trim();
  const result=document.getElementById('resumeResult');if(!result)return;
  result.innerHTML=(facts.length||skillsFound.length||showSummary)?`<div class="resume-box"><b>Review what InternAI found</b>${facts.length?`<div class="skills" style="margin-top:10px">${facts.map(([k,v,label])=>`<button type="button" class="skill" style="border:0" data-fact-key="${k}" onclick='acceptFact(this,${JSON.stringify(k)},${JSON.stringify(v)})'>+ ${esc(label)}: ${esc(v)}</button>`).join('')}</div>`:''}${skillsFound.length?`<div class="meta" style="margin-top:12px">Skills found</div><div class="skills" style="margin-top:7px">${skillsFound.map(s=>`<button type="button" class="skill" style="border:0" data-resume-skill="${esc(s.toLowerCase())}" onclick='acceptSkill(this,${JSON.stringify(s)})'>+ ${esc(s)}</button>`).join('')}</div>`:''}${showSummary?`<div class="review-box" style="margin-top:14px" data-summary-suggestion><b>Suggested professional summary</b><p style="margin:8px 0 12px;line-height:1.6;color:var(--muted)">${esc(summary)}</p><button type="button" class="btn dark small" onclick='acceptSummary(this,${JSON.stringify(summary)})'>Use this summary</button></div>`:''}<div class="meta" style="margin-top:10px">Review each suggestion before adding it. The summary is generated only from information detected in your uploaded resume and existing verified profile.</div></div>`:`<div class="notice">Everything recognized from this resume has already been reviewed or added.</div>`
}
function removeAcceptedResumeSkill(s){if(!s)return;document.querySelectorAll('[data-resume-skill]').forEach(btn=>{if(btn.getAttribute('data-resume-skill')===s.toLowerCase())btn.remove()});cleanupResumeReview()}
function cleanupResumeReview(){const result=document.getElementById('resumeResult');if(!result)return;const remaining=result.querySelectorAll('button[data-fact-key],button[data-resume-skill],[data-summary-suggestion]');if(!remaining.length&&state.profile.resumeText)result.innerHTML='<div class="notice">Everything recognized from this resume has already been reviewed or added.</div>'}
function acceptFact(btn,key,value){state.profile[key]=value;persist();const idMap={school:'pschool',major:'pmajor',grad:'pgrad',location:'plocation'};const input=document.getElementById(idMap[key]);if(input)input.value=value;refreshProfileCompletion();if(btn)btn.remove();cleanupResumeReview();toast(value+' saved to profile')}
function acceptSummary(btn,value){state.profile.summary=value;persist();const input=document.getElementById('psummary');if(input)input.value=value;refreshProfileCompletion();const box=btn?.closest('[data-summary-suggestion]');if(box)box.remove();cleanupResumeReview();toast('Professional summary saved')}
function acceptSkill(btn,s){if(!state.profile.skills.some(x=>x.toLowerCase()===s.toLowerCase()))state.profile.skills.push(s);persist();refreshSkills();if(btn)btn.remove();removeAcceptedResumeSkill(s);cleanupResumeReview();toast(s+' saved to profile')}
function resetDemo(){if(confirm('Clear all browser-local InternAI demo data?')){localStorage.removeItem('internai-demo');state=structuredClone(defaultState);toast('Demo reset');showPage('dashboard')}}
if(location.hash==='#app')openApp();
