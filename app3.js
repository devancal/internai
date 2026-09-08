function ensureApplication(j){
  let a=state.apps.find(x=>x.jobId===j.id);
  if(!a){a={id:crypto.randomUUID(),jobId:j.id,jobSnapshot:j,company:j.company,title:j.title,status:'Preparing',date:new Date().toISOString().slice(0,10),notes:'',draft:'',resumeNotes:'',answers:'',submittedAt:''};state.apps.unshift(a);persist();}
  else if(!a.jobSnapshot){a.jobSnapshot=j;persist()}
  return a;
}
function prepareJob(id){
  const j=getJobById(id);if(!j)return;
  const a=ensureApplication(j);openPrep(a.id);
}
function tailoredResumeNotes(j){
  const e=jobEvidence(j),p=state.profile;
  return `TAILORING PLAN — ${j.title}\n\nLead with verified strengths relevant to this role: ${e.matched.length?e.matched.join(', '):'No direct required-skill matches yet'}.\n\n${p.summary?`Keep your verified summary as source material: ${p.summary}\n\n`:''}Do not add these unverified items: ${[...e.missing,...e.preferred].join(', ')||'None identified'}.\n\nNext production step: generate a role-specific resume version while preserving only verified facts.`;
}
function coverDraft(a,j){
  const p=state.profile,e=jobEvidence(j);
  return `Dear ${a.company} Hiring Team,\n\nI am interested in the ${a.title} opportunity. ${p.school?`I am studying ${p.major||'engineering'} at ${p.school}${p.grad?`, with an expected graduation of ${p.grad}`:''}. `:''}${e.matched.length?`My background includes verified experience with ${e.matched.join(', ')}. `:''}${p.summary?p.summary+' ':''}\n\nI would welcome the opportunity to discuss how my background aligns with the role.\n\nSincerely,\n${p.name||'[Your name]'}`;
}
function answerDraft(j){
  const e=jobEvidence(j);
  return `Why are you interested in this role?\nI am interested in the hands-on engineering work described in this internship and the opportunity to contribute while continuing to develop my technical skills.\n\nRelevant qualifications\n${e.matched.length?`Verified matches: ${e.matched.join(', ')}.`:'No direct required-skill matches are verified yet.'}\n\nNote: Review and personalize every answer before using it.`;
}
function openPrep(appId){
  const a=state.apps.find(x=>x.id===appId); if(!a)return;
  const j=getJobById(a.jobId);
  if(!j){openApplication(appId);return}
  if(!a.draft)a.draft=coverDraft(a,j);
  if(!a.resumeNotes)a.resumeNotes=tailoredResumeNotes(j);
  if(!a.answers)a.answers=answerDraft(j);
  persist();
  const e=jobEvidence(j),p=state.profile;
  const facts=[p.school,p.major,p.grad,p.location,...e.matched].filter(Boolean);
  document.getElementById('page').innerHTML=`<div class="page-title"><div><button class="btn outline small" onclick="openJob('${j.id}')">← Match details</button><h1 style="margin-top:12px">Application Kit</h1><p>Get the materials for ${esc(j.company)} ready before you leave InternAI to submit.</p></div><span class="tag">${esc(a.status)}</span></div>
  <div class="flow-steps"><span class="flow-step">1 Match</span><span class="flow-step active">2 Application Kit</span><span class="flow-step">3 Apply</span><span class="flow-step">4 Track</span></div>
  <div class="notice"><b>Everything stays truth-first.</b> InternAI can emphasize verified facts, but it will never add a skill, project, or experience you haven't provided.</div>

  <div class="panel">
    <h3>Your application materials</h3><p class="meta">Choose what you want help with. Nothing here is required just because InternAI offers it.</p>
    <div class="kit-list">

      <div class="kit-item"><div class="kit-icon">📄</div><div><b>Tailored Resume</b><div class="meta">Your original resume is still usable. Tailoring can help the most relevant verified experience stand out for this role.</div><div class="choice-row"><button class="btn dark small" onclick="toggleKitMaterial('resumeDetail')">Tailor my resume</button><button class="btn outline small" onclick="toast('Original resume selected')">Use original resume</button></div></div><span class="kit-status recommended">Recommended</span></div>
      <div id="resumeDetail" class="material-detail" style="grid-column:1/-1">
        <div class="review-box"><b>Verified strengths to emphasize</b><div class="fact-strip">${e.matched.length?e.matched.map(x=>`<span class="fact-pill">${esc(x)}</span>`).join(''):'<span class="meta">No direct skill matches verified yet.</span>'}</div></div>
        <div class="field" style="margin-top:12px"><label>Tailoring notes</label><textarea id="resumeNotes" style="min-height:150px">${esc(a.resumeNotes)}</textarea></div>
        <p class="meta">This demo shows the emphasis plan. A production version can generate a reviewable role-specific copy while keeping every claim grounded in your verified profile and uploaded resume.</p>
      </div>

      <div class="kit-item"><div class="kit-icon">✉️</div><div><b>Cover Letter</b><div class="meta">Generate one only if you want it or the application asks for it.</div><div class="choice-row"><button class="btn dark small" onclick="toggleKitMaterial('coverDetail')">Generate cover letter</button><button class="btn outline small" onclick="toast('Cover letter skipped')">Skip</button></div></div><span class="kit-status optional">Optional</span></div>
      <div id="coverDetail" class="material-detail" style="grid-column:1/-1">
        <div class="doc-preview" id="coverPreview">${esc(a.draft)}</div>
        <div class="choice-row"><button class="btn outline small" onclick="toggleKitEditor('coverPreview','coverDraft')">Edit</button><button class="btn outline small" onclick="copyKitText('coverPreview')">Copy</button></div>
        <textarea id="coverDraft" style="display:none;min-height:210px;width:100%;margin-top:10px">${esc(a.draft)}</textarea>
      </div>

      <div class="kit-item"><div class="kit-icon">💬</div><div><b>Application Answers</b><div class="meta">Prepare answers only when an application actually asks you a question.</div><div class="choice-row"><button class="btn dark small" onclick="toggleKitMaterial('answersDetail')">Prepare answers</button><button class="btn outline small" onclick="toast('Application answers skipped')">Skip</button></div></div><span class="kit-status optional">Optional</span></div>
      <div id="answersDetail" class="material-detail" style="grid-column:1/-1">
        <div class="review-box"><b>Example application question</b><p style="margin:8px 0 10px">Why are you interested in this role?</p><div class="doc-preview" id="answerPreview">${esc(a.answers)}</div><div class="choice-row"><button class="btn outline small" onclick="toggleKitEditor('answerPreview','answerDraft')">Edit</button><button class="btn outline small" onclick="copyKitText('answerPreview')">Copy</button></div><textarea id="answerDraft" style="display:none;min-height:180px;width:100%;margin-top:10px">${esc(a.answers)}</textarea></div>
        <p class="meta">When real application questions are legitimately available, InternAI should show those instead of pretending generic prompts came from the employer.</p>
      </div>

    </div>
  </div>

  <div class="panel"><h3>Facts InternAI used</h3><p class="meta">These come from your profile. Missing qualifications are not silently added.</p><div class="fact-strip">${facts.map(x=>`<span class="fact-pill">${esc(x)}</span>`).join('')||'<span class="meta">Complete your profile to give InternAI more verified source material.</span>'}</div>
    <div class="row" style="margin-top:18px"><button class="btn outline" onclick="savePrep('${a.id}')">Save kit</button><button class="btn dark" onclick="readyToApply('${a.id}')">Continue to application →</button></div>
  </div>`;
}
