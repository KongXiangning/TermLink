const test=require('node:test'),assert=require('node:assert/strict');
process.env.SESSION_PERSIST_ENABLED='false';
process.env.SESSION_IDLE_TTL_MS='60000';
process.env.SESSION_CLEANUP_INTERVAL_MS='1000';
process.env.SESSION_MAX_COUNT='3';
const intervals=[]; const origInterval=global.setInterval;
global.setInterval=(fn,ms,...args)=>{const h=origInterval(fn,ms,...args);intervals.push(h);return h;};
const {SessionManager}=require('../../../src/services/sessionManager');
const mgr=new SessionManager(); global.setInterval=origInterval;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
const ws=()=>({readyState:1,send(){}});
test.after(async()=>{intervals.forEach(clearInterval);for(const id of [...mgr.sessions.keys()])mgr.deleteSession(id);await delay(200);});
test('real SessionManager and real PTY: TTL exact boundary retains; +1ms removes and releases process',async()=>{
 const s=await mgr.createSession({name:'V17 TTL boundary'}); const pid=s.ptyService.ptyProcess.pid;
 assert.ok(alive(pid));
 const now=Date.now(),orig=Date.now; Date.now=()=>now;
 try{s.lastActiveAt=now-60000;mgr.cleanupIdleSessions();assert.ok(mgr.sessions.has(s.id));s.lastActiveAt--;mgr.cleanupIdleSessions();assert.ok(!mgr.sessions.has(s.id));}finally{Date.now=orig;}
 await delay(500);assert.equal(alive(pid),false);console.log('V17 boundary PID released',pid);
});
test('real cleanup interval fires and removes expired idle session',async()=>{
 const s=await mgr.createSession({name:'V17 timer cleanup'});s.lastActiveAt=Date.now()-60100;
 await delay(1600);assert.ok(!mgr.sessions.has(s.id));
});
test('connected session is retained beyond idle TTL',async()=>{
 const s=await mgr.createSession({name:'V17 active retained'});mgr.addConnection(s,ws());s.lastActiveAt=Date.now()-100000;
 mgr.cleanupIdleSessions();assert.ok(mgr.sessions.has(s.id));mgr.deleteSession(s.id);
});
test('capacity evicts oldest idle process and keeps active and more recent idle',async()=>{
 const a=await mgr.createSession({name:'V17 active'}),b=await mgr.createSession({name:'V17 oldest idle'}),c=await mgr.createSession({name:'V17 newer idle'});
 mgr.addConnection(a,ws()); b.lastActiveAt=Date.now()-5000;c.lastActiveAt=Date.now()-1000;
 const oldPid=b.ptyService.ptyProcess.pid; const d=await mgr.createSession({name:'V17 capacity replacement'});
 assert.equal(mgr.sessions.size,3);assert.ok(mgr.sessions.has(a.id)&&mgr.sessions.has(c.id)&&mgr.sessions.has(d.id));assert.ok(!mgr.sessions.has(b.id));
 await delay(500);assert.equal(alive(oldPid),false);
 for(const id of [a.id,c.id,d.id])mgr.deleteSession(id);
});
test('capacity with all sessions connected refuses without killing active processes',async()=>{
 const created=[];for(let i=0;i<3;i++){const s=await mgr.createSession({name:'V17 capacity active '+i});mgr.addConnection(s,ws());created.push(s);}
 await assert.rejects(()=>mgr.createSession({name:'V17 must reject'}),e=>e.code==='SESSION_CAPACITY_EXCEEDED'&&e.maxSessionCount===3);
 assert.equal(mgr.sessions.size,3);for(const s of created)assert.ok(alive(s.ptyService.ptyProcess.pid));
 for(const s of created)mgr.deleteSession(s.id);
});
