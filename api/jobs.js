const SOURCES=[
  {provider:'lever',site:'foth',company:'Foth'},
  {provider:'lever',site:'hermeus',company:'Hermeus'},
  {provider:'lever',site:'nexuse-group',company:'Nexus Engineering Group'},
  {provider:'lever',site:'shieldai',company:'Shield AI'},
  {provider:'lever',site:'CesiumAstro',company:'CesiumAstro'},
  {provider:'greenhouse',site:'andurilindustries',company:'Anduril Industries'},
  {provider:'greenhouse',site:'astranis',company:'Astranis'},
  {provider:'greenhouse',site:'stokespacetechnologies',company:'Stoke Space'},
  {provider:'greenhouse',site:'freeformfuturecorp',company:'Freeform'},
  {provider:'greenhouse',site:'kairospower',company:'Kairos Power'},
  {provider:'greenhouse',site:'graviticsinc',company:'Gravitics'},
  {provider:'greenhouse',site:'amca',company:'Amca'},
  {provider:'greenhouse',site:'spacex',company:'SpaceX'},
  {provider:'greenhouse',site:'vardaspace',company:'Varda Space Industries'},
  {provider:'greenhouse',site:'awetomaton',company:'Awetomaton'}
];

const SKILLS=[
  ['SolidWorks',/solid\s?works/i],['Onshape',/onshape/i],['CAD',/\bCAD\b|computer[- ]aided design|autocad|inventor|solid\s?edge/i],
  ['Python',/\bpython\b/i],['JavaScript',/javascript/i],['Excel',/\bexcel\b|microsoft excel/i],
  ['Mechanical Design',/mechanical design|machine design|component design/i],['Mechanical Systems',/mechanical systems?|mechanical assembl/i],
  ['Thermodynamics',/thermodynamics?|heat transfer/i],['Data Analysis',/data analysis|analy[sz]e data/i],
  ['Process Optimization',/process optimization|process improvement|continuous improvement/i],['Project Management',/project management/i],
  ['Team Collaboration',/cross[- ]functional|collaborat|multidisciplinary/i],['Prototyping',/prototyp|rapid iteration/i],['GD&T',/GD&T|geometric dimension/i],
  ['Systems Engineering',/systems engineering|system integration/i],['Testing',/\btest(?:ing)?\b|verification|validation|test plan/i],
  ['Manufacturing',/manufactur|production line/i],['Technical Writing',/technical (?:documentation|writing)|engineering documentation/i],
  ['Requirements',/requirements? (?:development|management|analysis)|system requirements?/i],['Lean',/\blean\b|six sigma/i]
];

const DEGREE_FIELDS=[
  ['Mechanical',/mechanical engineering/i],['Aerospace',/aerospace engineering|aeronautical engineering/i],
  ['Manufacturing',/manufacturing engineering/i],['Industrial',/industrial engineering/i],['Systems',/systems engineering/i],
  ['Electrical',/electrical engineering/i],['Computer',/computer engineering/i],['Software',/software engineering|computer science/i],
  ['Chemical',/chemical engineering/i],['Civil',/civil engineering/i],['Biomedical',/biomedical engineering/i],
  ['Materials',/materials (?:science|engineering)|materials science and engineering/i],['Physics',/\bphysics\b/i],['Mathematics',/\bmathematics\b|\bmath\b/i]
];

function stripHtml(value=''){
  return String(value).replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
}
function skillsFrom(text=''){
  const found=SKILLS.filter(([,re])=>re.test(text)).map(([name])=>name);
  return found.length?found.slice(0,10):['Engineering'];
}
function degreeFieldsFrom(text=''){
  return DEGREE_FIELDS.filter(([,re])=>re.test(text)).map(([name])=>name);
}
function isInternshipText(title='',extra=''){
  const blob=`${title} ${extra}`.toLowerCase();
  const intern=/intern|co-?op|seasonal/.test(blob);
  const engineering=/engineer|mechanical|manufacturing|structures?|propulsion|systems?|test|controls?|process|piping|electrical|design|supply chain|avionics|flight software|gnc|automation|cad|hardware/.test(blob);
  const wrongYear=/202[0-6]|202[8-9]/.test(title);
  return intern&&engineering&&!wrongYear;
}
function seasonFromText(value=''){
  const text=String(value).toLowerCase();
  const seasons=[];
  if(titleHas(text,'spring'))seasons.push('Spring');
  if(titleHas(text,'summer'))seasons.push('Summer');
  if(titleHas(text,'fall')||titleHas(text,'autumn'))seasons.push('Fall');
  if(titleHas(text,'winter'))seasons.push('Winter');
  return seasons.length?seasons:['Unspecified'];
}
function titleHas(text,word){return text.includes(word)}
function inferMode(raw='',location='',content=''){
  const primary=`${raw} ${location}`.toLowerCase();
  if(/\bremote\b/.test(primary))return 'Remote';
  if(/\bhybrid\b/.test(primary))return 'Hybrid';
  const text=String(content).toLowerCase();
  if(/(?:work|position|role|internship) (?:is |will be )?(?:fully )?remote\b|remote (?:work|position|role|internship)\b/.test(text))return 'Remote';
  if(/(?:work|position|role|internship) (?:is |will be )?hybrid\b|hybrid (?:work|position|role|internship)\b/.test(text))return 'Hybrid';
  return 'On-site';
}
function normalizeCommon({id,company,title,location,mode,season,full,desc,source,applyUrl,provider,postedAt}){
  return {id,company,title,location:location||'Location not listed',mode,season,skills:skillsFrom(full),degreeFields:degreeFieldsFrom(full),preferred:[],deadline:'Not listed',source,applyUrl,desc:(desc||'See the employer listing for full role details.').slice(0,1400),live:true,provider,postedAt:postedAt||null};
}
function isLeverInternship(job){return isInternshipText(job.text||'',`${job.categories?.commitment||''} ${job.categories?.team||''}`)}
function locationFromLever(job){return job.categories?.location||job.categories?.allLocations?.join(' / ')||'Location not listed'}
function normalizeLever(job,source){
  const text=stripHtml(job.descriptionPlain||job.description||'');
  const lists=Array.isArray(job.lists)?job.lists.map(x=>`${x.text||''} ${stripHtml(x.content||'')}`).join(' '):'';
  const full=`${job.text||''} ${text} ${lists}`;
  const location=locationFromLever(job);
  return normalizeCommon({id:`lever-${source.site}-${job.id}`,company:source.company,title:job.text||'Engineering Internship',location,mode:inferMode(job.workplaceType||job.categories?.workplaceType||'',location,full),season:seasonFromText(full),full,desc:text||stripHtml(lists),source:'Live · employer Lever board',applyUrl:job.hostedUrl||job.applyUrl||'',provider:'Lever',postedAt:job.createdAt||null});
}
async function fetchLever(source){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),7000);
  try{
    const r=await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(source.site)}?mode=json`,{headers:{accept:'application/json','user-agent':'InternAI/1.0'},signal:controller.signal});
    if(!r.ok)throw new Error(`${source.site}: ${r.status}`);
    const data=await r.json();
    return (Array.isArray(data)?data:[]).filter(isLeverInternship).map(j=>normalizeLever(j,source));
  }finally{clearTimeout(timer)}
}
function normalizeGreenhouse(job,source){
  const title=job.title||'Engineering Internship';
  const content=stripHtml(job.content||'');
  const location=job.location?.name||'Location not listed';
  const dept=Array.isArray(job.departments)?job.departments.map(x=>x.name||'').join(' '):'';
  const office=Array.isArray(job.offices)?job.offices.map(x=>x.name||'').join(' '):'';
  const full=`${title} ${dept} ${office} ${content}`;
  return normalizeCommon({id:`greenhouse-${source.site}-${job.id}`,company:source.company,title,location,mode:inferMode('',location,content),season:seasonFromText(full),full,desc:content,source:'Live · employer Greenhouse board',applyUrl:job.absolute_url||'',provider:'Greenhouse',postedAt:job.updated_at?Date.parse(job.updated_at):null});
}
async function fetchGreenhouse(source){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),7000);
  try{
    const r=await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.site)}/jobs?content=true`,{headers:{accept:'application/json','user-agent':'InternAI/1.0'},signal:controller.signal});
    if(!r.ok)throw new Error(`${source.site}: ${r.status}`);
    const data=await r.json();
    return (Array.isArray(data.jobs)?data.jobs:[]).filter(j=>isInternshipText(j.title||'',`${(j.departments||[]).map(x=>x.name||'').join(' ')} ${stripHtml(j.content||'')}`)).map(j=>normalizeGreenhouse(j,source));
  }finally{clearTimeout(timer)}
}
async function fetchSource(source){return source.provider==='greenhouse'?fetchGreenhouse(source):fetchLever(source)}

module.exports=async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const settled=await Promise.allSettled(SOURCES.map(fetchSource));
  const jobs=settled.flatMap(x=>x.status==='fulfilled'?x.value:[]);
  const unique=[...new Map(jobs.map(j=>[j.applyUrl||j.id,j])).values()].sort((a,b)=>(b.postedAt||0)-(a.postedAt||0));
  res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=1800');
  return res.status(200).json({jobs:unique,count:unique.length,source:'public-employer-boards',providers:['Lever','Greenhouse'],employers:SOURCES.map(s=>s.company),updatedAt:new Date().toISOString(),partial:settled.some(x=>x.status==='rejected')});
};
