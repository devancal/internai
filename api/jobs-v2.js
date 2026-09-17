// Core ingestion hardening: bound outbound employer requests per invocation without mutating global fetch.
const corePath=require.resolve('./jobs');
const MAX_CONCURRENCY=6;
function createLimiter(nativeFetch){let active=0;const queue=[];function release(){active--;const next=queue.shift();if(next)next()}return async function limitedFetch(...args){if(active>=MAX_CONCURRENCY)await new Promise(resolve=>queue.push(resolve));active++;try{return await nativeFetch(...args)}finally{release()}}}
function loadCoreWithFetch(limitedFetch){const nativeFetch=global.fetch;try{global.fetch=limitedFetch;delete require.cache[corePath];return require('./jobs')}finally{global.fetch=nativeFetch}}
module.exports=async function handler(req,res){const limitedFetch=createLimiter(global.fetch);const core=loadCoreWithFetch(limitedFetch);return core(req,res)};
