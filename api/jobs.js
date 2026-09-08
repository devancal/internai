const SOURCES=[
  {provider:'lever',site:'foth',company:'Foth'},
  {provider:'lever',site:'hermeus',company:'Hermeus'},
  {provider:'lever',site:'nexuse-group',company:'Nexus Engineering Group'}
];

const SKILLS=[
  ['SolidWorks',/solid\s?works/i],['Onshape',/onshape/i],['CAD',/\bCAD\b|computer[- ]aided design/i],
  ['Python',/\bpython\b/i],['JavaScript',/javascript/i],['Excel',/\bexcel\b|microsoft excel/i],
  ['Mechanical Design',/mechanical design|machine design/i],['Mechanical Systems',/mechanical systems?/i],
  ['Thermodynamics',/thermodynamics?/i],['Data Analysis',/data analysis|analy[sz]e data/i],
  ['Process Optimization',/process optimization|process improvement/i],['Project Management',/project management/i],
  ['Team Collaboration',/cross[- ]functional|collaborat/i],['Prototyping',/prototyp/i],['GD&T',/GD&T|geometric dimension/i],
  ['Systems Engineering',/systems engineering/i],['Testing',/\btest(?:ing)?\b|verification|validation/i],
  ['Manufacturing',/manufactur/i],['Technical Writing',/technical (?:documentation|writing)/i],
  ['Requirements',/requirements? (?:development|management|analysis)|system requirements?/i],['Lean',/\blean\b|six sigma/i]
];

function stripHtml(value=''){
  return String(value).replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
}
function skillsFrom(text=''){
  const found=SKILLS.filter(([,re])=>re.test(text)).map(([name])=>name);
  return found.length?found.slice(0,8):['Engineering'];
}
function isInternship(job){
  const title=String(job.text||'');
  const commitment=String(job.categories?.commitment||'');
  const team=String(job.categories?.team||'');
  const blob=`${title} ${commitment} ${team}`.toLowerCase();
  const intern=/intern|co-?op|seasonal/.test(blob);
  const engineering=/engineer|mechanical|manufacturing|structures?|propulsion|systems?|test|controls?|process|piping|electrical|design|supply chain/.test(blob);
  const currentTarget=/2027/.test(title)||!/20\d{2}/.test(title);
  return intern&&engineering&&currentTarget;
}
function modeFrom(job){
  const raw=String(job.workplaceType||job.categories?.workplaceType||'').toLowerCase();
  if(raw.includes('remote'))return 'Remote';
  if(raw.includes('hybrid'))return 'Hybrid';
  return 'On-site';
}
function locationFrom(job){return job.categories?.location||job.categories?.allLocations?.join(' / ')||'Location not listed'}
function normalizeLever(job,source){
  const text=stripHtml(job.descriptionPlain||job.description||'');
  const lists=Array.isArray(job.lists)?job.lists.map(x=>`${x.text||''} ${stripHtml(x.content||'')}`).join(' '):'';
  const full=`${job.text||''} ${text} ${lists}`;
  const desc=(text||stripHtml(lists)||'See the employer listing for full role details.').slice(0,900);
  return {
    id:`lever-${source.site}-${job.id}`,
    company:source.company,
    title:job.text||'Engineering Internship',
    location:locationFrom(job),
    mode:modeFrom(job),
    skills:skillsFrom(full),
    preferred:[],
    deadline:'Not listed',
    source:'Live · employer Lever board',
    applyUrl:job.hostedUrl||job.applyUrl||'',
    desc,
    live:true,
    provider:'Lever',
    postedAt:job.createdAt||null
  };
}
async function fetchLever(source){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),7000);
  try{
    const r=await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(source.site)}?mode=json`,{headers:{accept:'application/json','user-agent':'InternAI/1.0'},signal:controller.signal});
    if(!r.ok)throw new Error(`${source.site}: ${r.status}`);
    const data=await r.json();
    return (Array.isArray(data)?data:[]).filter(isInternship).map(j=>normalizeLever(j,source));
  }finally{clearTimeout(timer)}
}

module.exports=async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const settled=await Promise.allSettled(SOURCES.map(fetchLever));
  const jobs=settled.flatMap(x=>x.status==='fulfilled'?x.value:[]);
  const unique=[...new Map(jobs.map(j=>[j.id,j])).values()].sort((a,b)=>(b.postedAt||0)-(a.postedAt||0));
  res.setHeader('Cache-Control','s-maxage=900, stale-while-revalidate=3600');
  return res.status(200).json({jobs:unique,count:unique.length,source:'public-employer-boards',providers:['Lever'],employers:SOURCES.map(s=>s.company),updatedAt:new Date().toISOString(),partial:settled.some(x=>x.status==='rejected')});
};
