function ensureApplication(j){
  let a=state.apps.find(x=>x.jobId===j.id);
  if(!a){a={id:crypto.randomUUID(),jobId:j.id,jobSnapshot:j,company:j.company,title:j.title,status:'Preparing',date:new Date().toISOString().slice(0,10),notes:'',draft:'',resumeNotes:'',tailoredResume:'',answers:'',submittedAt:'',kitChoices:{}};state.apps.unshift(a);persist();}
  else{if(!a.jobSnapshot)a.jobSnapshot=j;if(!a.kitChoices)a.kitChoices={};if(a.tailoredResume===undefined)a.tailoredResume='';persist()}
  return a;
}
function prepareJob(id){const j=getJobById(id);if(!j)return;const a=ensureApplication(j);openPrep(a.id)}
function tailoredResumeNotes(j){
  const e=jobEvidence(j),p=state.profile;
  return `CHANGES MADE — ${j.title}\n\n• Prioritized verified role matches: ${e.matched.length?e.matched.join(', '):'No direct required-skill matches identified'}.\n• Kept education and profile facts exactly as provided.\n• Did not add unverified qualifications: ${[...e.missing,...e.preferred].join(', ')||'None identified'}.\n• Original uploaded resume remains unchanged.`;
}
function tailoredResumeDraft(j){
  const p=state.profile,e=jobEvidence(j),skills=(p.skills||[]),matched=e.matched||[];
  const ordered=[...new Set([...matched,...skills])];
  const lines=[];
  lines.push((p.name||'YOUR NAME').toUpperCase());
  const contact=[p.personalEmail||p.schoolEmail,p.location].filter(Boolean).join(' · ');if(contact)lines.push(contact);
  lines.push('');
  lines.push('TARGETED SUMMARY');
  const intro=p.summary?p.summary.trim():`${p.major||'Engineering'} student${p.school?` at ${p.school}`:''}${p.grad?` graduating ${p.grad}`:''}.`;
  lines.push(intro);
  if(matched.length)lines.push(`Relevant verified strengths for ${j.company}: ${matched.join(', ')}.`);
  lines.push('');
  if(p.school||p.major||p.grad||p.gpa){lines.push('EDUCATION');lines.push([p.school,p.major,p.grad,p.gpa?`GPA ${p.gpa}`:''].filter(Boolean).join(' · '));lines.push('')}
  if(ordered.length){lines.push('RELEVANT SKILLS');lines.push(ordered.join(' · '));lines.push('')}
  if(p.resumeText){
    lines.push('VERIFIED EXPERIENCE & PROJECTS — ORIGINAL RESUME');
    lines.push('The text below is preserved from your uploaded resume so InternAI does not invent or rewrite experience claims. Edit the tailored copy only after reviewing it.');
    lines.push('');lines.push(p.resumeText.trim());
  }else{
    lines.push('EXPERIENCE & PROJECTS');lines.push('Upload your resume in Profile to include verified experience and project content here.');
  }
  return lines.join('\n');
}
function coverDraft(a,j){const p=state.profile,e=jobEvidence(j);return `Dear ${a.company} Hiring Team,\n\nI am interested in the ${a.title} opportunity. ${p.school?`I am studying ${p.major||'engineering'} at ${p.school}${p.grad?`, with an expected graduation of ${p.grad}`:''}. `:''}${e.matched.length?`My background includes verified experience with ${e.matched.join(', ')}. `:''}${p.summary?p.summary+' ':''}\n\nI would welcome the opportunity to discuss how my background aligns with the role.\n\nSincerely,\n${p.name||'[Your name]'}`}
function answerDraft(j){const e=jobEvidence(j);return `Why are you interested in this role?\nI am interested in the hands-on engineering work described in this internship and the opportunity to contribute while continuing to develop my technical skills.\n\nRelevant qualifications\n${e.matched.length?`Verified matches: ${e.matched.join(', ')}.`:'No direct required-skill matches are verified yet.'}\n\nNote: Review and personalize every answer before using it.`}
function kitChoiceButton(appId,type,value,label,detailId,selected){return `<button class="btn ${selected?'dark':'outline'} small" aria-pressed="${selected?'true':'false'}" data-kit-choice="${value}" data-label="${esc(label)}" onclick="selectKitChoice('${appId}','${type}','${value}','${detailId}')">${selected?'✓ ':''}${esc(label)}</button>`}
function saveTailoredResume(appId){const a=state.apps.find(x=>x.id===appId),el=document.getElementById('tailoredResumeDraft');if(!a||!el)return;a.tailoredResume=el.value;persist();const preview=document.getElementById('tailoredResumePreview');if(preview)preview.textContent=a.tailoredResume;toast('Tailored resume saved')}
function regenerateTailoredResume(appId){const a=state.apps.find(x=>x.id===appId);if(!a)return;const j=getJobById(a.jobId);if(!j)return;a.tailoredResume=tailoredResumeDraft(j);a.resumeNotes=tailoredResumeNotes(j);persist();openPrep(appId);toast('Tailored resume regenerated from verified facts')}
function openPrep(appId){
  const a=state.apps.find(x=>x.id===appId);if(!a)return;const j=getJobById(a.jobId);if(!j){openApplication(appId);return}
  if(!a.kitChoices)a.kitChoices={};if(!a.draft)a.draft=coverDraft(a,j);if(!a.resumeNotes)a.resumeNotes=tailoredResumeNotes(j);if(!a.tailoredResume)a.tailoredResume=tailoredResumeDraft(j);if(!a.answers)a.answers=answerDraft(j);persist();
  const e=jobEvidence(j),p=state.profile;const facts=[p.school,p.major,p.grad,p.location,...e.matched].filter(Boolean);const resumeChoice=a.kitChoices.resume||'',coverChoice=a.kitChoices.cover||'',answersChoice=a.kitChoices.answers||'';
  document.getElementById('page').innerHTML=`<div class="page-title"><div><button class="btn outline small" onclick="openJob('${j.id}')">← Match details</button><h1 style="margin-top:12px">Application Workspace</h1><p>Build and review your application for ${esc(j.company)} before you submit on the original site.</p></div><span class="tag">${esc(a.status)}</span></div>
  <div class="flow-steps"><span class="flow-step">1 Match</span><span class="flow-step active">2 Prepare</span><span class="flow-step">3 Apply</span><span class="flow-step">4 Track</span></div>
  <div class="notice"><b>Truth-first by design.</b> InternAI can reorganize and emphasize verified information, but it will not invent a skill, project, degree, or experience.</div>
  <div class="panel"><h3>Your application materials</h3><p class="meta">Choose what you want help with. Your original resume is never overwritten.</p><div class="kit-list">
    <div class="kit-item"><div class="kit-icon">📄</div><div><b>Tailored Resume</b><div class="meta">Create a reviewable role-specific copy from your verified profile and uploaded resume.</div><div class="choice-row" data-kit-choice-group="resume">${kitChoiceButton(a.id,'resume','tailored','Tailor my resume','resumeDetail',resumeChoice==='tailored')}${kitChoiceButton(a.id,'resume','original','Use original resume','resumeDetail',resumeChoice==='original')}</div></div><span class="kit-status recommended">Recommended</span></div>
    <div id="resumeDetail" class="material-detail ${resumeChoice==='tailored'?'open':''}" style="grid-column:1/-1">
      <div class="review-box"><b>Changes made</b><div style="white-space:pre-wrap;margin-top:8px">${esc(a.resumeNotes)}</div></div>
      <div class="field" style="margin-top:12px"><label>Tailored version — review before using</label><textarea id="tailoredResumeDraft" style="min-height:420px">${esc(a.tailoredResume)}</textarea></div>
      <div class="choice-row"><button class="btn dark small" onclick="saveTailoredResume('${a.id}')">Save tailored version</button><button class="btn outline small" onclick="copyKitText('tailoredResumeDraft')">Copy</button><button class="btn outline small" onclick="regenerateTailoredResume('${a.id}')">Reset from verified facts</button></div>
      <div id="tailoredResumePreview" style="display:none">${esc(a.tailoredResume)}</div><p class="meta">MVP note: this is a text-based tailored copy. It does not claim to preserve your original PDF formatting.</p>
    </div>
    <div class="kit-item"><div class="kit-icon">✉️</div><div><b>Cover Letter</b><div class="meta">Generate one only if you want it or the application asks for it.</div><div class="choice-row" data-kit-choice-group="cover">${kitChoiceButton(a.id,'cover','generate','Generate cover letter','coverDetail',coverChoice==='generate')}${kitChoiceButton(a.id,'cover','skipCover','Skip','coverDetail',coverChoice==='skipCover')}</div></div><span class="kit-status optional">Optional</span></div>
    <div id="coverDetail" class="material-detail ${coverChoice==='generate'?'open':''}" style="grid-column:1/-1"><div class="doc-preview" id="coverPreview">${esc(a.draft)}</div><div class="choice-row"><button class="btn outline small" onclick="toggleKitEditor('coverPreview','coverDraft')">Edit</button><button class="btn outline small" onclick="copyKitText('coverPreview')">Copy</button></div><textarea id="coverDraft" style="display:none;min-height:210px;width:100%;margin-top:10px">${esc(a.draft)}</textarea></div>
    <div class="kit-item"><div class="kit-icon">💬</div><div><b>Application Answers</b><div class="meta">Prepare answers only when an application actually asks you a question.</div><div class="choice-row" data-kit-choice-group="answers">${kitChoiceButton(a.id,'answers','prepare','Prepare answers','answersDetail',answersChoice==='prepare')}${kitChoiceButton(a.id,'answers','skipAnswers','Skip','answersDetail',answersChoice==='skipAnswers')}</div></div><span class="kit-status optional">Optional</span></div>
    <div id="answersDetail" class="material-detail ${answersChoice==='prepare'?'open':''}" style="grid-column:1/-1"><div class="review-box"><b>Example application question</b><p style="margin:8px 0 10px">Why are you interested in this role?</p><div class="doc-preview" id="answerPreview">${esc(a.answers)}</div><div class="choice-row"><button class="btn outline small" onclick="toggleKitEditor('answerPreview','answerDraft')">Edit</button><button class="btn outline small" onclick="copyKitText('answerPreview')">Copy</button></div><textarea id="answerDraft" style="display:none;min-height:180px;width:100%;margin-top:10px">${esc(a.answers)}</textarea></div><p class="meta">When real application questions are available, InternAI should use those instead of pretending generic prompts came from the employer.</p></div>
  </div></div>
  <div class="panel"><h3>Facts InternAI used</h3><p class="meta">These come from your profile and verified job matches.</p><div class="fact-strip">${facts.map(x=>`<span class="fact-pill">${esc(x)}</span>`).join('')||'<span class="meta">Complete your profile to give InternAI more verified source material.</span>'}</div><div class="row" style="margin-top:18px"><button class="btn outline" onclick="savePrep('${a.id}')">Save workspace</button><button class="btn dark" onclick="readyToApply('${a.id}')">Continue to application →</button></div></div>`;
}
