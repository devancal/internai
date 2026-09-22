// Backup files are untrusted input. Rebuild derived evidence and keep only supported fields.
const INTERN_BACKUP_LIMIT=5*1024*1024;
function decodeWorkspaceBackup(text){
 if(typeof text!=='string'||text.length>INTERN_BACKUP_LIMIT)throw Error('Choose an InternAI backup smaller than 5 MB.');
 let file;try{file=JSON.parse(text)}catch{throw Error('This file is not valid JSON. Choose a downloaded InternAI backup.')}
 const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const fail=()=>{throw Error('This backup contains invalid workspace data. Nothing was changed.')};
 const str=(v,fallback='')=>{if(v===undefined)return fallback;if(typeof v!=='string')fail();return v};
 const id=v=>{if(typeof v!=='string'||!v||v.length>300||!/^[a-zA-Z0-9_.:-]+$/.test(v))fail();return v};
 const strings=v=>{if(v===undefined)return[];if(!Array.isArray(v)||v.some(x=>typeof x!=='string'))fail();return [...v]};
 if(!object(file)||file.format!=='internai-workspace'||!object(file.workspace))fail();
 const w=file.workspace;if(w.version!==undefined&&(!Number.isInteger(w.version)||w.version<1||w.version>INTERN_STATE_VERSION))throw Error('This backup uses an unsupported workspace version. Nothing was changed.');
 if(!object(w.profile)||!Array.isArray(w.apps)||!Array.isArray(w.saved))fail();
 const next=structuredClone(defaultState);next.page='profile';
 for(const [key,value] of Object.entries(defaultState.profile))if(typeof value==='string')next.profile[key]=str(w.profile[key]);
 next.profile.skills=strings(w.profile.skills);
 const job=v=>{
  if(!object(v))fail();const out={id:id(v.id)};
  for(const key of ['company','title','location','mode','desc','source','provider','deadline','fetchedAt','status'])out[key]=str(v[key]);
  out.applyUrl=safeApplyUrl(str(v.applyUrl));
  for(const key of ['skills','preferred','season','degreeFields'])out[key]=strings(v[key]);
  for(const key of ['live','imported','closed']){if(v[key]!==undefined&&typeof v[key]!=='boolean')fail();out[key]=v[key]===true}
  for(const key of ['postedAt','year']){if(v[key]!=null&&(!Number.isFinite(v[key])||v[key]<0))fail();out[key]=v[key]??null}
  // Availability must be checked again after recovery, not trusted from a file.
  return out;
 };
 next.saved=w.saved.map(id);
 if(w.importedJobs!==undefined&&!Array.isArray(w.importedJobs))fail();
 next.importedJobs=(w.importedJobs||[]).map(job);
 const statuses=['Interested','Preparing','Ready','Applied','Interview','Offer','Rejected'];
 next.apps=w.apps.map(v=>{
  if(!object(v))fail();const out={id:id(v.id)};
  for(const key of ['company','title','date','createdAt','notes','draft','resumeNotes','tailoredResume','answers','submittedAt','interviewAt','offerAt','rejectedAt'])out[key]=str(v[key]);
  out.editedMaterials=strings(v.editedMaterials);if(out.editedMaterials.some(key=>!['draft','tailoredResume','answers'].includes(key)))fail();
  out.status=str(v.status,'Interested');if(!statuses.includes(out.status))fail();
  if(v.jobId)out.jobId=id(v.jobId);
  if(v.jobSnapshot){out.jobSnapshot=job(v.jobSnapshot);if(out.jobId!==out.jobSnapshot.id)fail()}
  if(v.kitChoices!==undefined&&!object(v.kitChoices))fail();out.kitChoices={};
  const choices={resume:['original','tailored'],cover:['generate','skipCover'],answers:['prepare','skipAnswers']};
  for(const [key,allowed] of Object.entries(choices)){const value=v.kitChoices?.[key];if(value!==undefined){if(!allowed.includes(value))fail();out.kitChoices[key]=value}}
  if(v.statusHistory!==undefined&&!Array.isArray(v.statusHistory))fail();
  out.statusHistory=(v.statusHistory||[]).map(h=>{if(!object(h)||!statuses.includes(h.from)||!statuses.includes(h.to)||typeof h.at!=='string'||!Number.isFinite(Date.parse(h.at)))fail();return{from:h.from,to:h.to,at:h.at}});
  return out;
 });
 for(const values of [next.apps,next.importedJobs])if(new Set(values.map(x=>x.id)).size!==values.length)fail();
 return next;
}
function workspaceRestoreSession(){return JSON.stringify([typeof internEpoch==='undefined'?0:internEpoch,typeof internUser==='undefined'?null:internUser?.id||null,localStorage.getItem('internai-local-owner')])}
function workspaceRestoreAllowed(){
 const owner=localStorage.getItem('internai-local-owner'),user=typeof internUser==='undefined'?null:internUser;
 if(owner&&owner!==user?.id)return false;
 if(typeof internTabStale!=='undefined'&&internTabStale)return false;
 if(typeof internUser!=='undefined'&&internUser&&(!internCloudReady||internCloudConflict||internHydrating||internPushActive))return false;
 if(typeof checkWorkspaceBaseline==='function'&&!checkWorkspaceBaseline())return false;
 return true;
}
function restoreWorkspaceBackup(next,expectedProfile,expectedData,expectedSession){
 if(workspaceRestoreSession()!==expectedSession||!workspaceRestoreAllowed()||state.profile!==expectedProfile||workspaceData(state)!==expectedData)throw Error('Your workspace changed. Close this preview and select the backup again after sync finishes.');
 const previous=state;
 // Save recovery first; a full disk must never turn a failed restore into data loss.
 const owner=localStorage.getItem('internai-local-owner')||'anonymous';
 localStorage.setItem('internai-before-restore:'+owner,JSON.stringify(previous));
 next.profile.evidence=buildCareerEvidence(next.profile.resumeText);
 next.profile.careerGraph=buildCareerGraph(next.profile.resumeText);
 state=next;
 try{if(persist()===false)throw Error('Could not save the restored workspace. Free browser storage and try again.')}catch(error){state=previous;try{localStorage.setItem('internai-demo',JSON.stringify(previous));if(typeof markWorkspaceBaseline==='function')markWorkspaceBaseline()}catch{throw Error('Browser storage failed. Your previous workspace remains open; keep your downloaded backup before closing this page.')}throw error}
 jobsData=[...(state.importedJobs||[]),...jobsData.filter(j=>!j.imported)];
 return true;
}
let workspaceBackupRequest=0;
async function previewWorkspaceBackup(file){
 if(!file)return;
 const request=++workspaceBackupRequest,expectedProfile=state.profile,expectedData=workspaceData(state),expectedSession=workspaceRestoreSession();
 try{
  if(!workspaceRestoreAllowed())throw Error('Finish cloud sync or resolve the workspace conflict before restoring a backup.');
  if(file.size>INTERN_BACKUP_LIMIT)throw Error('Choose an InternAI backup smaller than 5 MB.');
  const next=decodeWorkspaceBackup(await file.text());
  if(request!==workspaceBackupRequest)return;
  if(workspaceRestoreSession()!==expectedSession||state.profile!==expectedProfile||workspaceData(state)!==expectedData)throw Error('Your workspace changed while reading the file. Select it again.');
  document.getElementById('intern-backup-dialog')?.close();
  const dialog=document.createElement('dialog');dialog.id='intern-backup-dialog';
  dialog.style.cssText='border:1px solid #d7e1d9;border-radius:16px;padding:24px;width:min(460px,calc(100vw - 40px))';
  const account=typeof internUser!=='undefined'&&internUser?`the signed-in account (${internUser.email||'current account'})`:'this browser';
  dialog.innerHTML=`<h2>Restore workspace backup</h2><p>${esc(next.profile.name||'Unnamed profile')} · ${next.apps.length} applications · ${next.saved.length} saved roles</p><p>This replaces the profile, notes, drafts, and tracked applications in ${esc(account)}. Signed-in changes will sync to the cloud. Versions will not be merged.</p><p>Download your current workspace first so you can restore it later.</p><p data-error role="alert"></p><div class="row" style="flex-wrap:wrap"><button class="btn outline" data-backup>Download current workspace</button><button class="btn dark" data-restore disabled>Replace with backup</button><button class="btn outline" data-cancel>Cancel</button></div>`;
  dialog.addEventListener('close',()=>dialog.remove());
  dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
  dialog.querySelector('[data-backup]').onclick=()=>{exportWorkspaceBackup();dialog.querySelector('[data-restore]').disabled=false};
  dialog.querySelector('[data-restore]').onclick=()=>{try{restoreWorkspaceBackup(next,expectedProfile,expectedData,expectedSession);dialog.close();showPage('profile');toast('Backup restored. Review your profile and applications.')}catch(error){dialog.querySelector('[data-error]').textContent=error.message||'Restore failed. Your previous workspace is preserved.'}};
  document.body.appendChild(dialog);dialog.showModal();
 }catch(error){if(request===workspaceBackupRequest)toast(error.message||'Could not read the backup. Nothing was changed.')}
}
