const fs = require('node:fs');
const assert = require('node:assert/strict');
const manager = require(process.env.ASSESS_REPO + '/src/services/sessionManager');
(async () => {
 if (process.argv[2] === 'write') {
  const s = await manager.createSession({name:'assessment-original-metadata', sessionMode:'terminal', cwd:process.env.ASSESS_REPO, registrationId:'assessment-local-only'});
  manager.updateSession(s.id,{name:'assessment-renamed-metadata'});
  await new Promise(r=>setTimeout(r,900));
  const bytes = JSON.parse(fs.readFileSync(process.env.SESSION_PERSIST_PATH,'utf8'));
  const saved = bytes.sessions.find(x=>x.id===s.id); assert.equal(saved.name,'assessment-renamed-metadata');
  fs.writeFileSync(process.env.EXPECTED_PATH,JSON.stringify(saved));
  console.log(JSON.stringify({stage:'write',debounced_file_saved:true,id:s.id,name:saved.name,pty_initialized:s.ptyInitialized}));
  s.ptyService.kill(); process.exit(0);
 } else {
  const expected=JSON.parse(fs.readFileSync(process.env.EXPECTED_PATH,'utf8'));
  const restored=manager.getPersistableSessions().find(x=>x.id===expected.id);
  const except=['status','lastActiveAt'];
  for(const [k,v] of Object.entries(expected)){if(!except.includes(k))assert.deepEqual(restored[k],v,k)}
  const live=manager.sessions.get(expected.id); assert.equal(live.ptyInitialized,false);assert.equal(live.status,'IDLE');
  console.log(JSON.stringify({stage:'fresh-process-read',persisted_metadata_restored:true,id:restored.id,pty_initialized:live.ptyInitialized,status:live.status,scope:'SessionManager fresh-process constructor restoration, not HTTP server/deployment or PTY runtime continuity'}));process.exit(0);
 }
})().catch(e=>{console.error(e);process.exit(1)});
