// Supabase persistence bridge v1 — keeps the existing local-first MVP working while adding authenticated cloud sync.
const INTERN_SUPABASE_URL='https://hoodrasmrhdzkjhmrorq.supabase.co';
const INTERN_SUPABASE_KEY='sb_publishable_m6WNadKQPbivmJORFEageA_qKioCJiV';
let internSupabase=null,internUser=null,internSyncTimer=null,internHydrating=false,internEpoch=0,internCloudReady=false,internPushActive=false,internRevision=0;
const INTERN_OWNER_KEY='internai-local-owner';
let internWorkspaceOwner=localStorage.getItem(INTERN_OWNER_KEY);
function supabaseReady(){return !!(window.supabase&&window.supabase.createClient)}
function profileRow(p={}){return{user_id:internUser.id,name:p.name||'',personal_email:p.personalEmail||'',school_email:p.schoolEmail||'',school:p.school||'',major:p.major||'',grad:p.grad||'',gpa:p.gpa||'',location:p.location||'',work_preference:p.workPreference||'',summary:p.summary||'',skills:Array.isArray(p.skills)?p.skills:[],resume_text:p.resumeText||'',resume_filename:p.resumeFilename||'',evidence:Array.isArray(p.evidence)?p.evidence:[],career_graph:p.careerGraph||{},updated_at:new Date().toISOString()}}
function profileState(r={}){return{name:r.name||'',personalEmail:r.personal_email||'',schoolEmail:r.school_email||'',school:r.school||'',major:r.major||'',grad:r.grad||'',gpa:r.gpa||'',location:r.location||'',workPreference:r.work_preference||'',summary:r.summary||'',skills:r.skills||[],resumeText:r.resume_text||'',resumeFilename:r.resume_filename||'',evidence:r.evidence||[],careerGraph:r.career_graph||{}}}
// Each auth transition invalidates earlier async work. Account-owned recovery copies
// preserve unsynced data without letting another account inherit it.
const localResetDemo=resetDemo;resetDemo=function(){if(internUser)return toast('Sign out before resetting the local demo. Your cloud account will not be cleared.');return localResetDemo()};
const INTERN_PENDING_KEY='internai-sync-pending';
function recoveryKey(id){return 'internai-workspace:'+id}
function currentSession(id,epoch){return internUser?.id===id&&internEpoch===epoch}
function renderCloudWorkspace(){if(!document.getElementById('workspace').classList.contains('hidden'))showPage(state.page||'dashboard')}
function adoptInternUser(user){
 const id=user?.id||null;
 if(id===(internUser?.id||null)&&!(id===null&&localStorage.getItem(INTERN_OWNER_KEY))){internUser=user;return false}
 clearTimeout(internSyncTimer);internEpoch++;internCloudReady=false;internHydrating=false;internPushActive=false;
 const owner=internWorkspaceOwner;
 if(owner)localStorage.setItem(recoveryKey(owner),JSON.stringify(state));
 internUser=user;
 const cached=id&&(localStorage.getItem(INTERN_OWNER_KEY)===id?localStorage.getItem('internai-demo'):localStorage.getItem(recoveryKey(id)));
 if((owner&&owner!==id)||(!owner&&cached)){
  if(!owner)localStorage.setItem(recoveryKey('anonymous'),JSON.stringify(state));
  try{state=cached?JSON.parse(cached):structuredClone(defaultState)}catch{state=structuredClone(defaultState)}
  localStorage.setItem('internai-demo',JSON.stringify(state));
  internWorkspaceOwner=id;if(id)localStorage.setItem(INTERN_OWNER_KEY,id);else localStorage.removeItem(INTERN_OWNER_KEY);
 }
 jobsData=jobsData.filter(j=>!j.imported);jobsData=[...(state.importedJobs||[]),...jobsData];renderAccountControls();renderCloudWorkspace();return true;
}
async function cloudPull(){
 if(!internUser||internHydrating)return;
 const id=internUser.id,epoch=internEpoch,revision=internRevision;
 internHydrating=true;internCloudReady=false;renderAccountControls();
 try{
  const [{data:p,error:pe},{data:s,error:se}]=await Promise.all([
   internSupabase.from('profiles').select('*').eq('user_id',id).maybeSingle(),
   internSupabase.from('user_state').select('*').eq('user_id',id).maybeSingle()
  ]);
  if(!currentSession(id,epoch))return;
  if(pe)throw pe;if(se)throw se;
  const local=load(),owner=localStorage.getItem(INTERN_OWNER_KEY);
  const cloudProfile=profileState(p||{});
  const cloudHasData=Object.values(cloudProfile).some(v=>Array.isArray(v)?v.length:v&&typeof v==='object'?Object.keys(v).length:!!v)||(s&&((s.saved||[]).length||(s.applications||[]).length));
  const pending=owner===id&&localStorage.getItem(INTERN_PENDING_KEY+':'+id)==='true';
  // Do not silently overwrite edits made while the initial read was in flight.
  if(revision!==internRevision){toast('Cloud restore paused: local edits preserved. Reload to retry.');return}
  if((cloudHasData||(owner===id&&p&&s))&&!pending){
   if(!owner)localStorage.setItem(recoveryKey('anonymous'),JSON.stringify(local));
   state={...structuredClone(defaultState),page:local.page,profile:cloudProfile,saved:s?.saved||[],apps:s?.applications||[],...(owner===id&&local.importedJobs?{importedJobs:local.importedJobs}:{})};
  }else if(owner&&owner!==id){state=structuredClone(defaultState)}
  internWorkspaceOwner=id;localStorage.setItem(INTERN_OWNER_KEY,id);
  localStorage.setItem('internai-demo',JSON.stringify(state));
  internCloudReady=true;internHydrating=false;renderAccountControls();
  if((!cloudHasData&&!(owner===id&&p&&s))||pending)await cloudPush();
  if(currentSession(id,epoch)){jobsData=jobsData.filter(j=>!j.imported);jobsData=[...(state.importedJobs||[]),...jobsData];renderCloudWorkspace()}
 }catch(e){if(currentSession(id,epoch)){console.warn('InternAI cloud restore failed; local state preserved.');toast('Cloud restore unavailable. Local changes are safe; reload to retry.')}}
 finally{if(currentSession(id,epoch))internHydrating=false}
}
async function cloudPush(){
 if(!internUser||!internCloudReady||internHydrating||internPushActive)return;
 const id=internUser.id,epoch=internEpoch,revision=internRevision;
 if(localStorage.getItem(INTERN_OWNER_KEY)!==id)return;
 internPushActive=true;renderAccountControls();
 try{
  const p=profileRow(state.profile),s={user_id:id,saved:structuredClone(state.saved||[]),applications:structuredClone(state.apps||[]),updated_at:new Date().toISOString()};
  const [{error:pe},{error:se}]=await Promise.all([internSupabase.from('profiles').upsert(p),internSupabase.from('user_state').upsert(s)]);
  if(pe)throw pe;if(se)throw se;
  if(currentSession(id,epoch)&&revision===internRevision){localStorage.removeItem(INTERN_PENDING_KEY+':'+id);renderAccountControls()}
 }catch(e){if(currentSession(id,epoch)){localStorage.setItem(INTERN_PENDING_KEY+':'+id,'true');renderAccountControls();console.warn('InternAI cloud sync failed; local state preserved.');toast('Cloud sync failed. Changes are saved in this browser.')}}
 finally{if(currentSession(id,epoch)){internPushActive=false;renderAccountControls();if(revision!==internRevision){clearTimeout(internSyncTimer);internSyncTimer=setTimeout(cloudPush,350)}}}
}
function workspaceData(value){const {page,...data}=value;return JSON.stringify(data)}
const localPersist=persist;persist=function(){
 // A different tab may have switched accounts since this tab last rendered.
 const owner=localStorage.getItem(INTERN_OWNER_KEY);
 if((internUser&&owner&&owner!==internUser.id)||(!internUser&&owner))return;
 const changed=workspaceData(load())!==workspaceData(state);
 localPersist();if(!changed)return;internRevision++;
 if(internUser){localStorage.setItem(INTERN_PENDING_KEY+':'+internUser.id,'true');renderAccountControls();clearTimeout(internSyncTimer);internSyncTimer=setTimeout(cloudPush,350)}
};
async function internSignIn(email,password){if(!internSupabase)return toast('Cloud account service is still loading');const {error}=await internSupabase.auth.signInWithPassword({email,password});if(error)return toast(error.message);toast('Signed in — syncing your workspace')}
async function internSignUp(email,password){if(!internSupabase)return toast('Cloud account service is still loading');const {error}=await internSupabase.auth.signUp({email,password});if(error)return toast(error.message);toast('Account created — check your email if confirmation is required')}
async function internRequestPasswordReset(email){if(!internSupabase)return toast('Cloud account service is still loading');if(!email)return toast('Enter your account email first');const options=location.origin?{redirectTo:location.origin}:undefined;const {error}=await internSupabase.auth.resetPasswordForEmail(email,options);if(error)return toast(error.message);toast('If that account exists, a password reset email is on the way')}
function internPasswordUpdateDialog(){if(document.getElementById('intern-password-dialog'))return;const dialog=document.createElement('dialog');dialog.id='intern-password-dialog';dialog.style.cssText='border:1px solid #d7e1d9;border-radius:16px;padding:24px;width:min(420px,calc(100vw - 40px))';dialog.innerHTML=`<form><h2 style="margin-top:0">Choose a new password</h2><div class="field"><label for="intern-new-password">New password</label><input id="intern-new-password" name="password" type="password" autocomplete="new-password" minlength="8" required></div><p class="meta">Use at least 8 characters.</p><div class="row" style="margin-top:14px"><button class="btn dark" type="submit">Update password</button></div></form>`;dialog.addEventListener('close',()=>dialog.remove());dialog.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const password=event.currentTarget.elements.password.value;if(password.length<8)return toast('Use at least 8 characters');const {error}=await internSupabase.auth.updateUser({password});event.currentTarget.elements.password.value='';if(error)return toast(error.message);toast('Password updated');dialog.close()});document.body.appendChild(dialog);dialog.showModal()}
async function internSignOut(){if(!internSupabase)return;const userId=internUser?.id;const {error}=await internSupabase.auth.signOut();if(error)return toast(error.message);if(internUser&&internUser.id!==userId)return;adoptInternUser(null);renderAccountControls();toast('Signed out — your account workspace is preserved for your next sign-in')}
function accountControls(){return internUser?`<div class="row"><span style="font-size:11px;color:#64706a">${esc(internUser.email||'Signed in')}</span><button class="btn outline small" onclick="internSignOut()">Sign out</button></div>`:`<button class="btn outline small" onclick="accountDialog()">Sign in</button>`}
function accountDialog(){
 if(document.getElementById('intern-account-dialog'))return;
 const dialog=document.createElement('dialog');dialog.id='intern-account-dialog';
 dialog.style.cssText='border:1px solid #d7e1d9;border-radius:16px;padding:24px;width:min(420px,calc(100vw - 40px))';
 dialog.innerHTML=`<form><h2 style="margin-top:0">InternAI account</h2><div class="field"><label for="intern-account-email">Email</label><input id="intern-account-email" name="email" type="email" autocomplete="username" required></div><div class="field" style="margin-top:12px"><label for="intern-account-password">Password</label><input id="intern-account-password" name="password" type="password" autocomplete="current-password" required></div><p class="meta">New accounts require a password of at least 8 characters.</p><div class="row"><button class="btn dark" type="submit" name="action" value="signin">Sign in</button><button class="btn outline" type="submit" name="action" value="signup">Create account</button><button class="btn outline" type="button" data-reset>Forgot password?</button><button class="btn outline" type="button" data-cancel>Cancel</button></div></form>`;
 dialog.querySelector('[data-cancel]').addEventListener('click',()=>dialog.close());
 dialog.querySelector('[data-reset]').addEventListener('click',async()=>{const email=dialog.querySelector('#intern-account-email').value.trim();await internRequestPasswordReset(email)});
 dialog.addEventListener('close',()=>dialog.remove());
 dialog.querySelector('form').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget,email=form.elements.email.value.trim(),password=form.elements.password.value,create=event.submitter?.value==='signup';
  if(create&&password.length<8)return toast('Use at least 8 characters for a new password');
  const buttons=dialog.querySelectorAll('button[type="submit"]');buttons.forEach(button=>button.disabled=true);
  try{await (create?internSignUp(email,password):internSignIn(email,password))}catch{toast('Account service unavailable. Please try again.')}finally{form.elements.password.value='';dialog.close()}
 });
 document.body.appendChild(dialog);dialog.showModal();
}
function syncLabel(){if(!internUser)return'';if(internHydrating)return' · Restoring…';if(internPushActive||localStorage.getItem(INTERN_PENDING_KEY+':'+internUser.id)==='true')return' · Sync pending';return internCloudReady?' · Synced':' · Local only'}
function renderAccountControls(){const bar=document.querySelector('.appbar .row');if(!bar)return;let box=document.getElementById('account-controls');if(!box){box=document.createElement('span');box.id='account-controls';bar.prepend(box)}box.innerHTML=internUser?'<div class="row"><span style="font-size:11px;color:#64706a">'+esc(internUser.email||'Signed in')+esc(syncLabel())+'</span><button class="btn outline small" onclick="internSignOut()">Sign out</button></div>':accountControls()}
async function initInternCloud(){
 if(!supabaseReady())return;
 internSupabase=window.supabase.createClient(INTERN_SUPABASE_URL,INTERN_SUPABASE_KEY);
 // Register before getSession so a slow initial read cannot miss a sign-out.
 internSupabase.auth.onAuthStateChange((event,session)=>{
  const changed=adoptInternUser(session?.user||null);
  if(event==='PASSWORD_RECOVERY')setTimeout(internPasswordUpdateDialog,0);
  if(internUser&&(changed||(!internCloudReady&&!internHydrating)))setTimeout(cloudPull,0);
 });
 const epoch=internEpoch;
 const {data,error}=await internSupabase.auth.getSession();
 if(error){toast('Account session could not be restored. Your local workspace is preserved.');return}
 if(epoch!==internEpoch)return;
 adoptInternUser(data.session?.user||null);renderAccountControls();
 if(internUser)await cloudPull();
}
window.addEventListener('DOMContentLoaded',initInternCloud);
