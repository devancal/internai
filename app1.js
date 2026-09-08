const seedJobs=[
{id:'j1',company:'Aperture Robotics',title:'Mechanical Engineering Intern',location:'Pittsburgh, PA',mode:'Hybrid',skills:['CAD','SolidWorks','Python','Mechanical Design'],preferred:['Prototyping','GD&T'],deadline:'Oct 18, 2026',source:'Sample fallback',applyUrl:'https://example.com',desc:'Support mechanical design, CAD modeling, prototype testing, and engineering documentation for robotic systems.'},
{id:'j2',company:'Northstar Aerospace',title:'Engines Engineering Intern',location:'Cincinnati, OH',mode:'On-site',skills:['CAD','Thermodynamics','Excel','Mechanical Systems'],preferred:['Data Analysis','Testing'],deadline:'Oct 25, 2026',source:'Sample fallback',applyUrl:'https://example.com',desc:'Assist engineers with component design, test data review, root-cause analysis, and aircraft engine development.'},
{id:'j3',company:'Forge Mobility',title:'Product Design Engineering Intern',location:'Detroit, MI',mode:'Hybrid',skills:['SolidWorks','Onshape','Prototyping','GD&T'],preferred:['Manufacturing','Testing'],deadline:'Nov 2, 2026',source:'Sample fallback',applyUrl:'https://example.com',desc:'Create and revise CAD, support prototype builds, and collaborate with manufacturing and test teams.'},
{id:'j4',company:'Vector Automation',title:'Systems Engineering Intern',location:'Dayton, OH',mode:'On-site',skills:['Python','Data Analysis','Systems Engineering','Excel'],preferred:['Requirements','Testing'],deadline:'Oct 30, 2026',source:'Sample fallback',applyUrl:'https://example.com',desc:'Support requirements, test planning, data analysis, and cross-functional systems verification.'},
{id:'j5',company:'Lumen Manufacturing',title:'Process Engineering Intern',location:'Cleveland, OH',mode:'On-site',skills:['Excel','Process Optimization','Data Analysis','CAD'],preferred:['Manufacturing','Lean'],deadline:'Nov 8, 2026',source:'Sample fallback',applyUrl:'https://example.com',desc:'Analyze production processes, document improvements, and support fixture or workflow design.'},
{id:'j6',company:'Cascade Energy',title:'Mechanical Engineering Intern',location:'Remote',mode:'Remote',skills:['Mechanical Design','Python','Excel','CAD'],preferred:['Technical Writing','Data Analysis'],deadline:'Nov 15, 2026',source:'Sample fallback',applyUrl:'https://example.com',desc:'Support design analysis, technical documentation, and data-driven engineering projects.'}
];
const defaultState={profile:{name:'',personalEmail:'',schoolEmail:'',school:'',major:'',grad:'',gpa:'',location:'',workPreference:'',summary:'',skills:[],resumeText:'',resumeFilename:''},saved:[],apps:[],page:'dashboard'};
const schoolSuggestions=['The Ohio State University','University of Cincinnati','Case Western Reserve University','Cleveland State University','University of Akron','University of Dayton','Miami University','Ohio University','University of Toledo','University of Michigan','Michigan State University','Purdue University','University of Illinois Urbana-Champaign','Pennsylvania State University','Carnegie Mellon University','University of Pittsburgh','Georgia Institute of Technology','Virginia Tech','North Carolina State University','University of Texas at Austin','Texas A&M University','University of Wisconsin-Madison','Massachusetts Institute of Technology','Stanford University'];
const majorSuggestions=['Mechanical Engineering','Aerospace Engineering','Electrical Engineering','Computer Engineering','Computer Science','Civil Engineering','Chemical Engineering','Biomedical Engineering','Industrial and Systems Engineering','Materials Science and Engineering','Engineering Physics','Mechatronics Engineering','Robotics Engineering','Data Science','Mathematics','Physics'];
const locationSuggestions=['Cleveland, OH','Columbus, OH','Cincinnati, OH','Dayton, OH','Akron, OH','Toledo, OH','Pittsburgh, PA','Detroit, MI','Grand Rapids, MI','Chicago, IL','Indianapolis, IN','Boston, MA','New York, NY','Philadelphia, PA','Washington, DC','Charlotte, NC','Atlanta, GA','Orlando, FL','Tampa, FL','Miami, FL','Austin, TX','Dallas, TX','Houston, TX','Denver, CO','Phoenix, AZ','San Diego, CA','Los Angeles, CA','San Francisco, CA','San Jose, CA','Seattle, WA','Portland, OR','Remote'];
const gradSuggestions=[];for(let y=new Date().getFullYear();y<=new Date().getFullYear()+8;y++)for(const m of ['May','August','December'])gradSuggestions.push(`${m} ${y}`);
function options(list){return list.map(v=>`<option value="${esc(v)}"></option>`).join('')}
let state=load();
let jobsData=[...seedJobs],jobsSource='fallback',jobsLoaded=false,jobsLoading=false;
let jobFilters={query:'',location:'',mode:'all',saved:false,semester:'Summer'};
function load(){try{const saved=JSON.parse(localStorage.getItem('internai-demo')||'{}');return {...structuredClone(defaultState),...saved,profile:{...structuredClone(defaultState.profile),...(saved.profile||{})}}}catch{return structuredClone(defaultState)}}
function persist(){localStorage.setItem('internai-demo',JSON.stringify(state))}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function getJobById(id){return jobsData.find(x=>x.id===id)||state.apps.find(a=>a.jobId===id)?.jobSnapshot||seedJobs.find(x=>x.id===id)}
async function loadLiveJobs(force=false){
  if(jobsLoading||(!force&&jobsLoaded))return;
  jobsLoading=true;
  try{
    const res=await fetch('/api/jobs',{headers:{accept:'application/json'}});
    if(!res.ok)throw new Error(`Job feed returned ${res.status}`);
    const data=await res.json();
    if(Array.isArray(data.jobs)&&data.jobs.length){jobsData=data.jobs;jobsSource='live';jobsLoaded=true;}
    else throw new Error('No live roles returned');
  }catch(err){jobsSource='fallback';jobsLoaded=true;console.warn('InternAI live job feed unavailable; using fallback sample roles.',err)}
  finally{jobsLoading=false;if(state.page==='jobs')jobs();else if(state.page==='dashboard')dashboard()}
}
function openApp(){document.getElementById('landing').classList.add('hidden');document.getElementById('workspace').classList.remove('hidden');renderNav();showPage(state.page||'dashboard');loadLiveJobs()}
function goHome(){document.getElementById('workspace').classList.add('hidden');document.getElementById('landing').classList.remove('hidden');window.scrollTo(0,0)}
const pages=[['dashboard','Overview','▦'],['jobs','Discover','◎'],['applications','Applications','▣'],['profile','Profile','◉']];
function renderNav(){document.getElementById('nav').innerHTML=pages.map(([id,label,icon])=>`<button data-page="${id}" onclick="showPage('${id}')">${icon}&nbsp;&nbsp;${label}</button>`).join('')+`<button onclick="goHome()">←&nbsp;&nbsp;Landing page</button>`}
function showPage(id){state.page=id;persist();document.querySelectorAll('.side-nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));({dashboard, jobs, applications, profile}[id]||dashboard)();if((id==='dashboard'||id==='jobs')&&!jobsLoaded)loadLiveJobs()}
