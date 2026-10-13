const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),WS=require('ws'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');require('dotenv').config({path:path.join(root,'.env'),quiet:true});
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'phone-session.json'),'utf8'));
const auth='Basic '+Buffer.from(`${process.env.AUTH_USER||'admin'}:${process.env.AUTH_PASS||'admin'}`).toString('base64');
const headers={Authorization:auth,'Content-Type':'application/json'};
const req=async(method,url)=>{const r=await fetch('http://127.0.0.1:3010/api'+url,{method,headers});return {status:r.status,body:await r.json()};};
const threadIds=['01a133f5-c1ee-7872-9cdb-35fb08c08f00','01a133f6-ac63-7811-87ad-fda0bb7ec70e','01a133fd-6e2b-7c20-b868-41058aa0f0e4'];
(async()=>{
 const rows=[];
 for(const suffix of ['', '.1','.2']){
  const out=cp.spawnSync('adb',['-s','MQS7N19402011743','shell','run-as','com.termlink.app','cat','files/diagnostics/termlink-diagnostics.jsonl'+suffix],{encoding:'utf8',maxBuffer:32*1024*1024});
  for(const line of (out.stdout||'').split('\n')){try{const row=JSON.parse(line);if(row.ts>='2026-10-13T06:37:39.000Z'&&row.ts<'2026-10-13T06:45:00.000Z')rows.push(row);}catch{}}
 }
 const selected=[...new Map(rows.map(x=>[x.runId+':'+x.seq,x])).values()].filter(x=>/ipc.*(status|online)|connection\.state_changed|goal\.intent\.failed|new\.sent|history\.selection_generation_advanced|transport.*unavailable/i.test(x.event)).sort((a,b)=>a.ts.localeCompare(b.ts));
 fs.writeFileSync(path.join(__dirname,'phone-selected-diagnostics.json'),JSON.stringify({selection:'UTC 06:37:39..06:45:00; IPC status, connection transitions, goal intent failures, new and selection events; sourced from production diagnostic logs in memory',events:selected},null,2));
 const before=await req('GET','/sessions');assert.equal(before.status,200);
 const existing=before.body.filter(x=>x.id!==fixture.session.id);
 const restore=existing.find(x=>x.sessionMode==='codex'&&x.cwd==='E:\\coding\\TermLink'&&x.lastCodexThreadId);
 const results=[];
 const ws=new WS(`ws://127.0.0.1:3010/?sessionId=${fixture.session.id}&registrationId=${fixture.registrationId}`,{headers:{Authorization:auth}});
 await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
 const rpc=(threadId)=>new Promise(resolve=>{
  const requestId='s3-cleanup-'+threadId;
  const handler=raw=>{let f;try{f=JSON.parse(raw);}catch{return;}if(f.type==='codex_response'&&f.requestId===requestId){clearTimeout(t);ws.off('message',handler);resolve(f);}};
  const t=setTimeout(()=>{ws.off('message',handler);resolve({threadId,error:'deadline'});},15000);
  ws.on('message',handler);ws.send(JSON.stringify({type:'codex_request',method:'thread/archive',params:{threadId},requestId}));
 });
 for(const id of threadIds)results.push({threadId:id,response:await rpc(id)});
 ws.close();
 const deleted=await req('DELETE','/sessions/'+fixture.session.id);
 const after=await req('GET','/sessions');
 const shape=xs=>xs.map(x=>({id:x.id,name:x.name,sessionMode:x.sessionMode,cwd:x.cwd,lastCodexThreadId:x.lastCodexThreadId})).sort((a,b)=>a.id.localeCompare(b.id));
 assert.deepEqual(shape(after.body),shape(existing));
 fs.writeFileSync(path.join(__dirname,'phone-cleanup.json'),JSON.stringify({archivedOwnedTestThreads:results,deletedOwnedSession:deleted,existingSessionDefinitionsUnchanged:true,remainingSessionIds:after.body.map(x=>x.id),restoreExistingSession:restore?{id:restore.id,profileId:'task005-s2-local',lastCodexThreadId:restore.lastCodexThreadId}:null,registrationNote:'HTTP test registration stays revoked as an API tombstone; existing phone registration was not revoked.'},null,2));
 console.log(JSON.stringify({archiveResults:results.map(x=>({id:x.threadId,error:x.response.error||null})),testSessionDeleted:deleted.status,existingSessionDefinitionsUnchanged:true,diagnosticEvents:selected.length,restoreSessionId:restore?.id}));
})().catch(e=>{console.error(e);process.exitCode=1;});
