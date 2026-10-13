const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..');require('dotenv').config({path:path.join(root,'.env'),quiet:true});
const raw=cp.execFileSync('adb',['-s','MQS7N19402011743','shell','run-as','com.termlink.app','cat','shared_prefs/client_registrations.xml'],{encoding:'utf8'});
const encoded=raw.match(/<string name="registration_task005-s2-local">(.*?)<\/string>/s)[1];
const reg=JSON.parse(encoded.replace(/&quot;/g,'"').replace(/&amp;/g,'&')).registrationId;
const headers={Authorization:'Basic '+Buffer.from(`${process.env.AUTH_USER||'admin'}:${process.env.AUTH_PASS||'admin'}`).toString('base64'),'Content-Type':'application/json','X-TermLink-Registration-Id':reg};
(async()=>{
 const cwd=path.join(__dirname,'workspace');fs.mkdirSync(cwd,{recursive:true});
 const r=await fetch('http://127.0.0.1:3010/api/sessions',{method:'POST',headers,body:JSON.stringify({name:'TASK20260868-S3-Codex',sessionMode:'codex',cwd})});if(r.status!==200)throw Error('create failed '+r.status);
 const s=await r.json();fs.writeFileSync(path.join(__dirname,'phone-session.json'),JSON.stringify({session:s,profileId:'task005-s2-local',registrationId:reg},null,2));console.log(JSON.stringify(s));
})();
