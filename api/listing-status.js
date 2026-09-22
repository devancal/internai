// Read-only verification against fixed public ATS API hosts; never fetch a supplied URL.
function postingTarget(value){
 let u;try{u=new URL(value)}catch{return null}
 if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
 let m;
 if(u.hostname==='jobs.lever.co'&&(m=u.pathname.match(/^\/([a-zA-Z0-9_-]{1,80})\/([a-f0-9-]{36})(?:\/apply)?\/?$/)))return{provider:'Lever',id:m[2],url:`https://api.lever.co/v0/postings/${m[1]}/${m[2]}?mode=json`};
 if(['boards.greenhouse.io','job-boards.greenhouse.io'].includes(u.hostname)&&(m=u.pathname.match(/^\/([a-zA-Z0-9_-]{1,80})\/jobs\/(\d{1,20})\/?$/)))return{provider:'Greenhouse',id:m[2],url:`https://boards-api.greenhouse.io/v1/boards/${m[1]}/jobs/${m[2]}`};
 return null;
}
function createHandler(fetch=global.fetch){return async(req,res)=>{
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'})}
 const input=req.query?.url,target=typeof input==='string'&&input.length<=2048?postingTarget(input):null;
 if(!target)return res.status(200).json({status:'unknown',reason:'Automatic checks support direct Lever and Greenhouse posting links only.'});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);let status='unknown';
 try{
  const response=await fetch(target.url,{headers:{accept:'application/json'},redirect:'error',signal:controller.signal});
  if(response.status===404||response.status===410)status='unavailable';
  else if(response.ok){const data=await response.json();if(String(data.id)===target.id&&(data.title||data.text))status='open'}
 }catch{}finally{clearTimeout(timer)}
 res.setHeader('Cache-Control',status==='unknown'?'no-store':'s-maxage=120');
 return res.status(200).json({status,provider:target.provider,checkedAt:new Date().toISOString(),reason:status==='open'?'The provider currently returns this posting. Review the employer page before submitting.':status==='unavailable'?'The provider no longer returns this posting at its recorded link. It may have closed or moved.':'The provider could not be checked. This does not mean the posting is closed.'});
}}
module.exports=createHandler();module.exports.createHandler=createHandler;module.exports.postingTarget=postingTarget;
