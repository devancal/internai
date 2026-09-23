// Strict fixed vocabulary: never log submitted objects or raw error strings.
const CODES=new Set(['local_save_failed','cloud_read_failed','cloud_write_failed','feed_partial','script_error','unhandled_rejection','download_failed']);
let windowStart=0,count=0;
module.exports=function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'})}
 const origins=new Set(['https://internai-mvp-fixed-devancalabrese-2065.vercel.app']);
 for(const host of [process.env.VERCEL_URL,process.env.VERCEL_PROJECT_PRODUCTION_URL])if(host&&/^[-a-z0-9.]+$/i.test(host))origins.add('https://'+host);
 if(!origins.has(req.headers.origin))return res.status(403).json({error:'Origin not allowed'});
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))return res.status(415).json({error:'JSON required'});
 let body=req.body;
 try{if(Buffer.isBuffer(body))body=body.toString('utf8');if(typeof body==='string'){if(Buffer.byteLength(body)>256)throw Error();body=JSON.parse(body)}if(!body||Array.isArray(body)||Object.keys(body).length!==2||!CODES.has(body.code)||body.version!==2||!Object.hasOwn(body,'code')||!Object.hasOwn(body,'version'))throw Error()}catch{return res.status(400).json({error:'Invalid diagnostic'})}
 // Best-effort per-instance cap, not a distributed rate limiter.
 const now=Date.now();if(now-windowStart>=60000){windowStart=now;count=0}if(count>=30)return res.status(429).json({error:'Try later'});count++;
 console.warn(JSON.stringify({event:'internai_client_error',code:body.code,version:2}));
 return res.status(202).json({accepted:true});
};
