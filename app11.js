// Job Requirement Graph v1 — turn employer text into explicit, weighted requirements before matching.
function requirementSentences(text=''){
 // Preserve employer bullet/section boundaries and common degree abbreviations.
 return String(text).replace(/<[^>]+>/g,' ').replace(/\b(?:B\.S\.|M\.S\.|B\.A\.|Ph\.D\.|U\.S\.C\.|U\.S\.)/g,x=>x.replace(/\./g,''))
  .split(/\n+|(?<=[.!?;])\s+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(x=>x.length>=4&&x.length<=800);
}
function requirementKind(text=''){const t=text.toLowerCase();if(/preferred|bonus|nice to have|ideally|plus\b/.test(t))return'preferred';if(/degree|major|pursuing|enrolled|student|graduat|gpa|citizen|authorization|authorized|sponsor|visa|eligible/.test(t))return'eligibility';if(/required|must|proficien|experience with|knowledge of/.test(t))return'required';if(/responsibil|you will|you'll|duties|what you.*do|work on|support|design|develop|build|test|analy|manufactur/.test(t))return'responsibility';return'required'}
function requirementWeight(kind){return kind==='required'?1:kind==='eligibility'?.9:kind==='responsibility'?.72:.55}
function requirementLabel(text='',i=0){const clean=text.replace(/^[-–—•\s]+/,'').trim();return clean.length<=150?clean:`${clean.slice(0,147).trim()}…`||`Requirement ${i+1}`}
function buildJobRequirementGraph(j){
 const sentences=requirementSentences(j.desc||''),nodes=[];let section=null;
 const add=(text,kind,source='Employer listing',skills=evidenceSkillHits(text))=>{if(nodes.some(n=>n.text===text))return;nodes.push({id:`jobreq-${nodes.length}`,kind,label:requirementLabel(text),text,skills,tokens:evidenceTokens(text),weight:requirementWeight(kind),source})};
 for(const sentence of sentences){
  const heading=sentence.replace(/[:\s]+$/,'').toLowerCase();
  if(/^(requirements|qualifications|minimum qualifications|basic qualifications|what you bring|what we're looking for)$/.test(heading)){section='required';continue}
  if(/^(bonus|preferred qualifications|preferred|nice to have)$/.test(heading)){section='preferred';continue}
  if(/^(role|responsibilities|duties|what you'll do|what you will do)$/.test(heading)){section='responsibility';continue}
  if(/^(benefits|compensation|about us|equal opportunity|sms terms of service)/i.test(heading)){section='ignore';continue}
  if(section==='ignore'||!/[a-zA-Z]/.test(sentence))continue;
  if(sentence===j.title||sentence.toLowerCase().startsWith((j.company||'__no_company__').toLowerCase()+' ')||/^(our |we |many past interns|if you have already graduated)/i.test(sentence))continue;
  if(!section&&!/required|requirement|qualif|preferred|degree|major|pursuing|enrolled|student|graduat|gpa|citizen|authorized|authorization|sponsor|visa|experience|proficien|knowledge|familiar|ability|responsibil|you will|you'll|design|develop|build|test|analy|manufactur|cad|solidworks|python|matlab|excel/i.test(sentence))continue;
  const kind=requirementKind(sentence);if(/(?:base|hourly|annual) (?:pay|salary)|\$\s*\d/.test(sentence.toLowerCase()))continue;add(sentence,kind==='eligibility'?kind:section==='preferred'?'preferred':section||kind);
 }
 for(const skill of j.skills||[]){if(!skill||skill==='Engineering'||nodes.some(n=>n.skills.some(s=>s.toLowerCase()===skill.toLowerCase())))continue;add(`Employer listing identifies ${skill}`,'required','Employer listing metadata',[skill])}
 // Degree metadata lists alternatives, not a requirement to hold every listed major.
 const fields=(j.degreeFields||[]).filter(Boolean);
 if(fields.length&&!nodes.some(n=>n.kind==='eligibility'&&fields.some(d=>n.text.toLowerCase().includes(d.toLowerCase()))))add(`Accepted degree fields: ${fields.join(' or ')}`,'eligibility','Employer listing metadata',[]);
 return{version:2,jobId:j.id,nodes:nodes.slice(0,40)};
}
function jobRequirementGraph(j){if(!j)return{version:1,nodes:[]};const fingerprint=`${j.title||''}|${j.desc||''}|${(j.skills||[]).join(',')}|${(j.degreeFields||[]).join(',')}`;if(j.__requirementGraph?.version!==2||j.__requirementFingerprint!==fingerprint){j.__requirementGraph=buildJobRequirementGraph(j);j.__requirementFingerprint=fingerprint}return j.__requirementGraph}
function claimSupportForRequirement(req,j){const graph=ensureCareerGraph(),profileSkills=new Set((state.profile.skills||[]).map(x=>x.toLowerCase())),direct=req.skills.filter(s=>profileSkills.has(s.toLowerCase())),candidates=graph.claims.map(claim=>{const parent=graph.nodes.find(n=>n.id===claim.parentId),skillHits=(claim.skills||[]).filter(s=>req.skills.some(r=>r.toLowerCase()===s.toLowerCase())||req.text.toLowerCase().includes(s.toLowerCase())),tokenHits=(claim.tokens||[]).filter(t=>req.tokens.includes(t)),score=skillHits.length*6+Math.min(tokenHits.length,8);return{claim,parent,score,skillHits,tokenHits}}).filter(x=>x.score>=2).sort((a,b)=>b.score-a.score);return{supported:direct.length>0||candidates.length>0,direct,candidates:candidates.slice(0,3),score:direct.length?12:(candidates[0]?.score||0)}}
function structuredRequirementMap(j){return jobRequirementGraph(j).nodes.map(req=>{const support=claimSupportForRequirement(req,j),best=support.candidates[0];return{req:req.label,kind:req.kind,weight:req.weight,supported:support.supported,support:support.direct.length?`Profile skill: ${support.direct.join(', ')}`:best?.parent?`${best.parent.type}: ${best.parent.title}`:'Not documented in current evidence',evidenceIds:support.candidates.map(x=>x.parent?.id).filter(Boolean),claimIds:support.candidates.map(x=>x.claim.id),supportScore:support.score}})}
requirementEvidenceMap=function(j){return structuredRequirementMap(j)};
function weightedRequirementCoverage(j){const map=structuredRequirementMap(j);if(!map.length)return 0;const total=map.reduce((n,x)=>n+x.weight,0);return total?map.filter(x=>x.supported).reduce((n,x)=>n+x.weight,0)/total:0}
careerEvidenceCoverage=function(j){return weightedRequirementCoverage(j)};
function hardRequirementRisk(j){const map=structuredRequirementMap(j),hard=map.filter(x=>x.kind==='required'||x.kind==='eligibility');if(!hard.length)return 0;return hard.filter(x=>!x.supported).reduce((n,x)=>n+x.weight,0)/hard.reduce((n,x)=>n+x.weight,0)}
const _opportunityPriorityRequirements=opportunityPriority;opportunityPriority=function(j){const base=_opportunityPriorityRequirements(j),coverage=weightedRequirementCoverage(j),risk=hardRequirementRisk(j);return base+Math.round(coverage*7)-Math.round(risk*5)};
function jobRequirementSummary(j){const map=structuredRequirementMap(j),required=map.filter(x=>x.kind==='required'||x.kind==='eligibility'),preferred=map.filter(x=>x.kind==='preferred'),responsibilities=map.filter(x=>x.kind==='responsibility');return{required,preferred,responsibilities,supported:map.filter(x=>x.supported),gaps:map.filter(x=>!x.supported),coverage:weightedRequirementCoverage(j)}}
