// Bound employer requests, including response bodies, within this invocation.
const {createHandler}=require('./jobs');
function createLimiter(nativeFetch,signal,max=6){
 let active=0;const queue=[];
 function release(){const next=queue.shift();if(next)next();else active--}
 return async function limitedFetch(url,options={}){
  const combined=options.signal?AbortSignal.any([signal,options.signal]):signal;
  combined.throwIfAborted();
  if(active>=max)await new Promise(resolve=>queue.push(resolve));else active++;
  try{
   combined.throwIfAborted();
   const response=await nativeFetch(url,{...options,signal:combined});
   // Keep a permit until the body is consumed, not just until headers arrive.
   const body=await response.arrayBuffer();
   return new Response([204,205,304].includes(response.status)?null:body,{status:response.status,statusText:response.statusText,headers:response.headers});
  }finally{release()}
 };
}
module.exports=async function handler(req,res){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{return await createHandler(createLimiter(global.fetch,controller.signal))(req,res)}finally{clearTimeout(timer)}
};
module.exports.createLimiter=createLimiter;
