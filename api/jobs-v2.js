// Core ingestion hardening: bound all outbound employer requests without rewriting source adapters.
const nativeFetch=global.fetch;
const MAX_CONCURRENCY=6;
let active=0;
const queue=[];
function release(){active--;const next=queue.shift();if(next)next()}
async function limitedFetch(...args){if(active>=MAX_CONCURRENCY)await new Promise(resolve=>queue.push(resolve));active++;try{return await nativeFetch(...args)}finally{release()}}
module.exports=async function handler(req,res){const previous=global.fetch;global.fetch=limitedFetch;try{const core=require('./jobs');return await core(req,res)}finally{global.fetch=previous}}
