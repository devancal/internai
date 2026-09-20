const fs=require('node:fs');
const vm=require('node:vm');
function runtime(files=Array.from({length:18},(_,i)=>`app${i+1}.js`)){
 const storage=new Map(),listeners={},timers=new Map();let timerId=0;
 const node={classList:{contains:()=>true,add(){},remove(){},toggle(){}},querySelector:()=>null,querySelectorAll:()=>[],prepend(){},innerHTML:'',textContent:''};
 const ctx=vm.createContext({console:{info(){},warn(){},error(){}},resetDemo(){},structuredClone,URL,AbortController,Date,Math,JSON,Set,Map,Promise,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},document:{getElementById:()=>node,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}},setTimeout:fn=>{timers.set(++timerId,fn);return timerId},clearTimeout:id=>timers.delete(id),fetch:async()=>{throw Error('offline')},window:{addEventListener:(k,fn)=>listeners[k]=fn},crypto:require('node:crypto').webcrypto,navigator:{},location:{hash:""}});
 for(const file of files)vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
 return {ctx,storage,timers,listeners,run:code=>vm.runInContext(code,ctx)};
}
module.exports={runtime};
if(require.main===module){const r=runtime();console.log(JSON.stringify(r.ctx.window.internAIMatchRegressionResult,null,2));process.exitCode=r.ctx.window.internAIMatchRegressionResult.passed?0:1;}
