// Test-only control of the real feed lifecycle. No wire frames or UI state are fabricated.
if (/[\\/]src[\\/]server\.js$/.test(require('node:path').resolve(process.argv[1] || ''))) {
 const fs=require('node:fs'),path=require('node:path');
 const {CodexIpcFeed}=require('../../src/services/codexIpcFeed');
 const original=CodexIpcFeed.prototype.start;
 let feed,last='',busy=false,originalAllowActive;
 const log=(data)=>fs.appendFileSync(path.join(__dirname,'ipc-control-events.jsonl'),JSON.stringify({time:new Date().toISOString(),pid:process.pid,...data})+'\n');
 CodexIpcFeed.prototype.start=async function(...args){feed=this;const r=await original.apply(this,args);log({event:'start',online:this.online,desiredFollowing:this._desiredFollowing.size});return r;};
 setInterval(async()=>{
  if(!feed||busy)return;
  let cmd;try{cmd=JSON.parse(fs.readFileSync(path.join(__dirname,'ipc-command.json'),'utf8'));}catch{return;}
  if(cmd.id===last)return;last=cmd.id;busy=true;
  try{
   if(cmd.action==='stop'){
    if(originalAllowActive===undefined)originalAllowActive=feed._client._config;
    feed._client._config=Object.freeze({...originalAllowActive,allowActive:false});
    feed.stop();
   }else if(cmd.action==='start'){
    if(originalAllowActive!==undefined)feed._client._config=originalAllowActive;
    await feed.start();
   }else throw Error('invalid test action');
   log({event:cmd.action,id:cmd.id,online:feed.online,activeSendAllowed:feed.allowActiveSend,controlledSendGate:true,desiredFollowing:feed._desiredFollowing.size});
  }
  catch(e){log({event:'error',id:cmd.id,message:e.message});}finally{busy=false;}
 },250).unref();
}
