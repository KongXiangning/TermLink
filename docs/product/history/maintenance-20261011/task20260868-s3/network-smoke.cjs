const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const WebSocket = require('ws');
const root = path.resolve(__dirname, '../..');
require('dotenv').config({path:path.join(root,'.env'),quiet:true});
const auth='Basic '+Buffer.from(`${process.env.AUTH_USER||'admin'}:${process.env.AUTH_PASS||'admin'}`).toString('base64');
const result={date:new Date().toISOString(),endpoint:'local dev 3010',checks:[],cleanup:[],errors:[]};
const sessions=new Set(), regs=new Set();
const request=async(method,url,reg,body)=>{
 const r=await fetch('http://127.0.0.1:3010/api'+url,{method,headers:{Authorization:auth,'Content-Type':'application/json',...(reg?{'X-TermLink-Registration-Id':reg}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
 return {status:r.status,body:await r.json()};
};
const list=async()=>{const r=await request('GET','/sessions');assert.equal(r.status,200);return r.body;};
const wsProbe=(reg,id,unauth=false)=>new Promise((resolve,reject)=>{
 const q=new URLSearchParams();if(reg)q.set('registrationId',reg);if(id)q.set('sessionId',id);
 const frames=[];const ws=new WebSocket('ws://127.0.0.1:3010/?'+q,{headers:unauth?{}:{Authorization:auth}});
 const timer=setTimeout(()=>{ws.terminate();reject(Error('WS deadline'));},10000);
 ws.on('message',raw=>{const f=JSON.parse(raw);frames.push(f.type);if(f.type==='session_info'){sessions.add(f.sessionId);ws.close(1000);}});
 ws.on('close',(code,reason)=>{clearTimeout(timer);resolve({code,reason:reason.toString(),frames});});
 ws.on('error',e=>{clearTimeout(timer);reject(e);});
});
const snapshot=rows=>rows.map(x=>({id:x.id,name:x.name,registrationId:x.registrationId,activeConnectionCount:x.activeConnectionCount})).sort((a,b)=>a.id.localeCompare(b.id));
(async()=>{
 let baseline;
 try{
  baseline=snapshot(await list());result.before=baseline;
  const unauth=await fetch('http://127.0.0.1:3010/api/sessions');assert.equal(unauth.status,401);result.checks.push({case:'HTTP basic auth required',status:unauth.status});
  const unauthWs=await wsProbe(null,null,true);assert.equal(unauthWs.code,4401);assert.deepEqual(unauthWs.frames,[]);result.checks.push({case:'WS basic auth required',...unauthWs});
  const rr=await request('POST','/client-registrations',null,{clientType:'s3-smoke'});assert.equal(rr.status,201);const reg=rr.body.registrationId;regs.add(reg);
  const sr=await request('POST','/sessions',reg,{name:'TASK20260868-S3-http',sessionMode:'terminal',cwd:root});assert.equal(sr.status,200);const id=sr.body.id;sessions.add(id);
  const activeList=await request('GET','/sessions',reg);assert.equal(activeList.status,200);assert(activeList.body.some(x=>x.id===id));
  const rename=await request('PATCH','/sessions/'+id,reg,{name:'TASK20260868-S3-renamed'});assert.equal(rename.status,200);
  const files=await request('GET',`/sessions/${id}/workspace/files?q=package&limit=2`,reg);assert.equal(files.status,200);
  result.checks.push({case:'active HTTP create/list/rename/workspace',statuses:[sr.status,activeList.status,rename.status,files.status]});
  for(const sid of [id,null]){const out=await wsProbe(reg,sid);assert.equal(out.code,1000);assert.equal(out.frames[0],'session_info');result.checks.push({case:sid?'active WS reuse':'active WS create',...out});}
  const legacy=await wsProbe(null,null);assert.equal(legacy.code,1000);assert.equal(legacy.frames[0],'session_info');result.checks.push({case:'legacy WS create',...legacy});
  const legacyId=[...sessions].at(-1);const reuse=await wsProbe(null,legacyId);assert.equal(reuse.code,1000);result.checks.push({case:'legacy WS reuse',...reuse});
  const unknown='s3-unknown-'+randomUUID();
  for(const [label,rid] of [['unknown',unknown],['revoked',reg]]){
   if(label==='revoked'){const revoked=await request('DELETE','/client-registrations/'+reg);assert.equal(revoked.body.revoked,true);}
   const before=snapshot(await list());
   for(const [method,url,body] of [['GET','/sessions'],['POST','/sessions',{name:'MUST-NOT-CREATE',sessionMode:'terminal'}],['PATCH','/sessions/'+id,{name:'MUST-NOT-RENAME'}],['DELETE','/sessions/'+id],['GET',`/sessions/${id}/workspace/files?q=package`]]){
    const out=await request(method,url,rid,body);assert.equal(out.status,403);assert.equal(out.body.code,'REGISTRATION_INVALID');result.checks.push({case:label+' HTTP '+method+' '+url,status:out.status,code:out.body.code});
   }
   for(const sid of [id,null]){const out=await wsProbe(rid,sid);assert.equal(out.code,4403);assert.deepEqual(out.frames,[]);result.checks.push({case:label+(sid?' WS reuse':' WS create'),...out});}
   const after=snapshot(await list());assert.deepEqual(after,before);result.checks.push({case:label+' no observable session create/rename/delete/attach',equal:true,before,after});
  }
  result.passed=true;
 }catch(e){result.passed=false;result.errors.push(e.stack);}
 finally{
  for(const id of sessions){try{const r=await request('DELETE','/sessions/'+id);result.cleanup.push({kind:'owned test session',id,status:r.status});}catch(e){result.errors.push(e.message);}}
  for(const id of regs){try{const r=await request('DELETE','/client-registrations/'+id);result.cleanup.push({kind:'owned test registration revoke',id,status:r.status});}catch(e){result.errors.push(e.message);}}
  try{result.afterCleanup=snapshot(await list());assert.deepEqual(result.afterCleanup,baseline);result.cleanupBaselineRestored=true;}catch(e){result.passed=false;result.errors.push(e.message);}
  fs.writeFileSync(path.join(__dirname,'network-result.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({passed:result.passed,checks:result.checks.length,cleanupBaselineRestored:result.cleanupBaselineRestored,errors:result.errors}));
  process.exitCode=result.passed?0:1;
 }
})();
