//! Business matrix audit. Inputs and expected values are independent of target output.
//! A business assertion emits AUDIT_ASSERT; any other panic is a harness failure.
use std::{collections::{BTreeMap, BTreeSet}, fs, io::{BufRead, BufReader, Write},
    path::PathBuf, process::{Child, ChildStdin, Command, Stdio},
    sync::{mpsc, atomic::AtomicBool}, thread, time::{Duration, SystemTime, UNIX_EPOCH}};
use serde_json::{Value, json};
use codex_rollout_collector::protocol::*;
use codex_rollout_collector::source::{LineageError, SourceReadPlanError, SegmentError};
use codex_rollout_collector::{JsonlSourceBackend, SourceSpec, SourceFixtureHash,
    SourceFingerprint, SourcePrefixAnchor, SourceByteRange, SourceReadMode,
    SegmentAssembler, SegmentDescriptor, SegmentCompleteness, SourceSegment,
    CompatibilityProfile, AnalysisReducer, analyze_records_with_adapter};
use codex_rollout_collector::codex_adapter::CodexEventAdapter;
use std::cell::RefCell;
thread_local! { static DIFFERENCES: RefCell<Vec<String>> = const { RefCell::new(Vec::new()) }; }

const A: &str = "019b2b40-beb6-7b23-bed0-37d570e76816";
const B: &str = "019b2b40-beb6-7b23-bed0-37d570e76817";
const CHILD: &str = "019b2b40-beb6-7b23-bed0-37d570e76818";
const HEAD: &str = "019b2b40-beb6-7b23-bed0-37d570e76819";

fn check(id: &str, field: &str, actual: Value, expected: Value) {
    println!("AUDIT_OBSERVATION {}", json!({"case":id,"field":field,"actual":actual,"expected":expected}));
    if actual != expected {
        println!("AUDIT_ASSERT {}", json!({"case":id,"field":field,"actual":actual,"expected":expected,"classification":"business-oracle"}));
        DIFFERENCES.with(|d|d.borrow_mut().push(format!("{id}/{field}")));
    }
}
fn unavailable(id: &str,field: &str,reason: &str) {
    println!("AUDIT_LIMITATION {}",json!({"case":id,"field":field,"reason":reason,"status":"prerequisite-not-met"}));
}
struct Fixture { root: PathBuf }
impl Fixture {
    fn new() -> Self {
        let stamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let root = std::env::temp_dir().join(format!("termlink-business-{}-{stamp}", std::process::id()));
        fs::create_dir_all(&root).unwrap();
        Self { root }
    }
    fn write(&self, rollout: &str, day: u8, lines: &[Value]) -> PathBuf {
        for value in lines {
            let ty = value["payload"]["type"].as_str().unwrap_or("");
            if !["audit_future", "thread_goal_updated", "SubAgentActivity"].contains(&ty) {
                codex_rollout_collector::codex_wire::decode_rollout_line(value.clone())
                    .unwrap_or_else(|error| panic!("invalid synthetic input: {error}; {value}"));
            }
        }
        let dir = self.root.join(format!("2026/08/{day:02}"));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join(format!("rollout-2026-08-{day:02}T00-00-00-{rollout}.jsonl"));
        let data = encode(lines);
        // Keep exact generated input in external evidence storage.
        println!("AUDIT_INPUT {}", json!({"path":path,"bytes":data.len(),"lines":lines.len(),"contents":data}));
        fs::write(&path, data).unwrap();
        path
    }
    fn startup(&self) -> TargetStartupConfig {
        match parse_startup_args(vec!["--startup-config-version".into(),"1".into(),
            "--sessions-root".into(),self.root.as_os_str().to_owned()]).unwrap() {
            StartupMode::Target(c) => c, _ => panic!("fixture startup"),
        }
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let parent = std::env::temp_dir().canonicalize().unwrap();
        let resolved = self.root.canonicalize().unwrap();
        assert!(resolved.starts_with(parent) && resolved.file_name().unwrap().to_string_lossy().starts_with("termlink-business-"));
        fs::remove_dir_all(resolved).unwrap();
        if !std::thread::panicking() {
            DIFFERENCES.with(|d| { if let Some(first)=d.borrow().first() { panic!("business assertion {first}"); } });
        }
    }
}
fn encode(lines: &[Value]) -> String { lines.iter().map(|v| format!("{v}\n")).collect() }
fn line(kind: &str, payload: Value) -> Value {
    json!({"timestamp":"2026-08-26T00:00:00Z","type":kind,"payload":payload})
}
fn event(payload: Value) -> Value { line("event_msg",payload) }
fn header(conv: &str) -> Value {
    line("session_meta",json!({"id":conv,"timestamp":"2026-08-26T00:00:00Z","cwd":"C:/audit",
        "originator":"synthetic_cli","cli_version":"synthetic-1","source":"cli","model_provider":"synthetic","git":{}}))
}
fn message(role: &str, text: &str, id: &str, turn: &str) -> Value {
    if role == "user" {
        return event(json!({"type":"user_message","client_id":id,"message":text,
            "images":null,"image_details":[],"local_images":[]}));
    }
    line("response_item",json!({"type":"message","id":id,"role":role,
        "content":[{"type":if role=="user" {"input_text"} else {"output_text"},"text":text}],
        "internal_chat_message_metadata_passthrough":{"turn_id":turn}}))
}
fn turn(n: usize, suffix: &str, terminal: bool) -> Vec<Value> {
    let t=format!("T{n}{suffix}");
    let mut v=vec![event(json!({"type":"task_started","turn_id":t,"model_context_window":128000,"collaboration_mode_kind":"default"})),
        message("user",&format!("U{n}{suffix}"),&format!("U{n}{suffix}"),&t),
        message("assistant",&format!("A{n}{suffix}"),&format!("A{n}{suffix}"),&t)];
    if terminal { v.push(event(json!({"type":"task_complete","turn_id":t,"last_agent_message":format!("A{n}{suffix}"),"duration_ms":1000}))); }
    v
}
fn ordinalize(mut v: Vec<Value>, start: u64) -> Vec<Value> {
    for (i,x) in v.iter_mut().enumerate() { x["ordinal"]=json!(start+i as u64); }
    v
}
fn history(n: usize) -> Vec<Value> {
    let mut v=vec![header(A)]; for i in 1..=n { v.extend(turn(i,"",true)); } ordinalize(v,0)
}
fn request(mode: TargetAnalyzeMode) -> TargetAnalyzeRequest {
    TargetAnalyzeRequest::new("read-1","audit-job",A,mode)
}
fn mapped(f: &Fixture, q: &TargetAnalyzeRequest) -> Result<Value,TargetSourceReadError> {
    let s=read_target_source(q,&f.startup(),&AtomicBool::new(false))?;
    println!("AUDIT_SEGMENTS {:?}",s.segments);
    let m=map_target_source_read(q,&s)?;
    let value=json!({"payload":m.batch.payload,"checkpoint":m.complete.checkpoint});
    println!("AUDIT_RESULT {value}");
    Ok(value)
}
fn resource_error(e: &TargetSourceReadError) -> bool {
    matches!(e, TargetSourceReadError::ResourceLimit(_)
        | TargetSourceReadError::ReadPlan(SourceReadPlanError::SegmentLimitExceeded { .. }))
}
fn expected_success(id: &str, result: Result<Value,TargetSourceReadError>) -> Value {
    match result { Ok(v)=>v, Err(e)=>{
        // Only these cases intentionally exercise a bounded physical window.
        // IO, bad fixture/binding, invalid request, timeout and mapping errors
        // remain unclassified infrastructure failures, never audit successes.
        assert!(matches!(id,"R02"|"R06"|"R09"|"R21"|"R22"|"R24"|"R25"|"R27"|"R28"|"R29"|"R30"|"R31") && resource_error(&e),
            "infrastructure {id}/source: {e:?}");
        check(id,"source_result",json!({"code":e.wire_error_code(),"error":format!("{e:?}")}),json!("successful bounded read")); panic!("business assertion {id}/source_result")
    } }
}
fn items(v: &Value) -> Vec<Value> {
    v["payload"]["history_items"].as_array().expect("target history_items shape").clone()
}
fn texts(v: &Value) -> Vec<String> {
    items(v).iter().filter(|e| matches!(e["event_type"].as_str(),Some("UserMessage"|"AssistantMessage")))
        .map(|e|e["payload"]["text"].as_str().unwrap().to_string()).collect()
}
fn expected_texts(n: usize) -> Vec<String> {
    (1..=n).flat_map(|i|[format!("U{i}"),format!("A{i}")]).collect()
}
fn event_items(v: &Value, kind: &str) -> Vec<Value> {
    items(v).into_iter().filter(|e|e["event_type"]==kind).collect()
}
fn check_texts(id: &str,v: &Value,n: usize) { check(id,"body_order",json!(texts(v)),json!(expected_texts(n))); }
fn continue_from(q: &mut TargetAnalyzeRequest,v: &Value) {
    q.cursor=serde_json::from_value(v["payload"]["next_cursor"].clone()).unwrap();
    q.persisted_anchor=Some(serde_json::from_value(v["checkpoint"].clone()).unwrap());
}
struct Process { child: Child, input: ChildStdin, output: mpsc::Receiver<String> }
impl Process {
    fn new(f: &Fixture) -> Self {
        let mut child=Command::new(env!("CARGO_BIN_EXE_codex-rollout-collector"))
            .args(["--startup-config-version","1","--sessions-root"]).arg(&f.root)
            .env_remove("TERMLINK_TARGET_PROTOCOL_TEST_DELIVERY")
            .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::inherit()).spawn().unwrap();
        let input=child.stdin.take().unwrap(); let out=child.stdout.take().unwrap();
        let (tx,rx)=mpsc::channel();
        thread::spawn(move || { for line in BufReader::new(out).lines() { if tx.send(line.unwrap()).is_err(){break;} } });
        let mut p=Self{child,input,output:rx};
        p.send(TargetMessage::NodeHello(TargetNodeHello::new("generation",
            ["analyze_v1","cancel","checkpoint","ack"])));
        assert!(matches!(p.read(),TargetMessage::AnalyzerHello(_)),"handshake failed");
        p
    }
    fn send(&mut self,m: TargetMessage) {
        let s=m.to_json_line().expect("test request validates");
        println!("AUDIT_SEND {s}"); writeln!(self.input,"{s}").unwrap(); self.input.flush().unwrap();
    }
    fn read(&mut self) -> TargetMessage {
        let s=self.output.recv_timeout(Duration::from_secs(15)).expect("infrastructure: stdout timeout/disconnect");
        println!("AUDIT_RECV {s}"); TargetMessage::parse_line(&s).expect("target wire shape")
    }
    fn batch(&mut self,id: &str,q: TargetAnalyzeRequest) -> TargetBatchMessage {
        let request_id=q.header.request_id.clone(); let job_id=q.job_id.clone();
        self.send(TargetMessage::Analyze(q));
        match self.read() {
            TargetMessage::Batch(b)=>{ self.validate_batch(id,&b,&request_id,&job_id); b },
            TargetMessage::Error(e)=>Self::unexpected_error(id,e),
            m=>{check(id,"batch",json!(format!("{m:?}")),json!("batch"));panic!("business assertion {id}/batch")}
        }
    }
    fn validate_batch(&self,id: &str,b: &TargetBatchMessage,request_id: &str,job_id: &str) {
        check(id,"batch_request",json!(b.header.request_id),json!(request_id));
        check(id,"batch_job",json!(b.job_id),json!(job_id));
    }
    fn unexpected_error(id: &str,e: TargetErrorMessage) -> ! {
        assert!(matches!(id,"R02"|"R06"|"R09") && e.code=="resource_limit_exceeded",
            "infrastructure {id}/wire: {e:?}");
        check(id,"bounded_read_error",json!(e),json!("successful bounded read")); panic!("business assertion {id}/bounded_read_error")
    }
    fn ack(&mut self,b: &TargetBatchMessage,accepted: bool) {
        self.send(TargetMessage::Ack(TargetAckMessage::new(b.header.request_id.clone(),b.job_id.clone(),
            b.segment_id.clone(),b.batch_id.clone(),accepted,accepted,
            if accepted {None} else {Some("batch_validation_failed")})));
    }
    fn run(&mut self,id: &str,q: TargetAnalyzeRequest) -> Value {
        let request_id=q.header.request_id.clone();let job_id=q.job_id.clone();
        self.send(TargetMessage::Analyze(q));
        self.finish(id,&request_id,&job_id,vec![])
    }
    fn finish(&mut self,id: &str,request_id: &str,job_id: &str,mut batches: Vec<Value>) -> Value {
        loop { match self.read() {
            TargetMessage::Batch(b)=>{
                self.validate_batch(id,&b,request_id,job_id);
                if let Some(first)=batches.first() {
                    check(id,"batch_source_scope",json!([b.payload.conversation_id,b.payload.source_id,b.payload.source_epoch]),
                        json!([first["conversation_id"],first["source_id"],first["source_epoch"]]));
                }
                self.ack(&b,true);batches.push(json!(b.payload));
            },
            TargetMessage::Complete(c)=>{
                check(id,"complete_request",json!(c.header.request_id),json!(request_id));
                check(id,"complete_job",json!(c.job_id),json!(job_id));
                // Keep every delivery visible. Latest projection/checkpoint is
                // a snapshot; event arrays retain distinct physical events.
                // Exact per-case delta assertions inspect raw_history too.
                let mut payload=batches.last().cloned().unwrap_or(json!({"history_items":[]}));
                let raw:Vec<Value>=batches.iter().flat_map(|b|b["history_items"].as_array().unwrap().clone()).collect();
                let mut assembled:Vec<Value>=vec![];
                for e in &raw {
                    let key=&e["payload"]["metadata"]["event_id"];
                    if let Some(old)=assembled.iter_mut().find(|x|x["payload"]["metadata"]["event_id"]==*key) { *old=e.clone(); }
                    else { assembled.push(e.clone()); }
                }
                payload["history_items"]=json!(assembled);
                return json!({"payload":payload,"checkpoint":c.checkpoint,"batches":batches,"raw_history":raw});
            },
            TargetMessage::Error(e)=>Self::unexpected_error(id,e),
            m=>{check(id,"terminal_or_batch",json!(format!("{m:?}")),json!("batch or complete"));panic!("business assertion {id}/terminal_or_batch")}
        } }
    }
    fn error(&mut self,id: &str,code: &str,request_id: &str) {
        match self.read() {
            TargetMessage::Error(e)=>{
                assert!(!matches!(e.code.as_str(),"resource_timeout"|"analysis_failed"|"invalid_request"),
                    "infrastructure {id}/terminal: {e:?}");
                check(id,"terminal_code",json!(e.code),json!(code));
                check(id,"terminal_request",json!(e.header.request_id),json!(request_id));
                check(id,"terminal_nonfatal",json!(e.fatal),json!(false));
            },
            m=>check(id,"error_terminal",json!(format!("{m:?}")),json!(code))
        }
    }
}
impl Drop for Process { fn drop(&mut self) { let _=self.child.kill(); let _=self.child.wait(); } }

#[test] fn r01_small_history() {
    let f=Fixture::new(); f.write(A,26,&history(1));
    let v=expected_success("R01",mapped(&f,&request(TargetAnalyzeMode::Preview)));
    check_texts("R01",&v,1); check("R01","complete",v["payload"]["complete"].clone(),json!(true));
    check("R01","turns",json!(event_items(&v,"TurnStarted").len()),json!(1));
}
#[test] fn r02_recent_then_backward() {
    let f=Fixture::new(); let mut h=history(4);
    let extras=[message("assistant","检查完成","M21","T2"),message("assistant","检查完成","M22","T2")];
    h.splice(7..7,extras);h.splice(7..7,tool_input());
    prepare_windows(&mut h);let h=ordinalize(h,0);f.write(A,26,&h);
    let v=window_history("R02",&f,&h);
    let expected=["U1","A1","U2","检查完成","检查完成","A2","U3","A3","U4","A4"];
    check("R02","all_body_order",json!(texts(&v)),json!(expected));
    check("R02","complete",v["payload"]["complete"].clone(),json!(true));
    for (text,turn) in [("A1","T1"),("A2","T2")] {
        let e=items(&v).into_iter().find(|e|e["payload"]["text"]==text);
        check("R02",&format!("{text}_old_turn"),e.map(|e|e["payload"]["metadata"]["turn_id"].clone()).unwrap_or(Value::Null),json!(turn));
    }
    check("R02","safe_promotion",v["payload"]["next_cursor"]["cursor_kind"].clone(),json!("forward_append"));
    let keys: Vec<_>=items(&v).iter().filter(|e|e["payload"]["text"]=="检查完成")
        .map(|e|e["payload"]["metadata"]["item_key"].as_str().unwrap().to_string()).collect();
    check("R02","equal_text_distinct_keys",json!(keys.iter().collect::<BTreeSet<_>>().len()),json!(2));
}
// Padding is a schema-ignored envelope field, not an extra business record.
// Each older record is > half the segment budget, so begin/end and
// question/answers cannot share a legal segment. The last turn is unpadded.
fn prepare_windows(h: &mut [Value]) {
    let tail_start=h.len()-4;
    for v in &mut h[1..tail_start] {
        v["audit_padding"]=json!("p".repeat(1000));
        if matches!(v["payload"]["id"].as_str(),Some("A1"|"A2")) {
            v["payload"].as_object_mut().unwrap().remove("internal_chat_message_metadata_passthrough");
        }
    }
}
fn window_history(id: &str,f: &Fixture,h: &[Value]) -> Value {
    internal_windows(id,f,h);
    let tail_bytes=encode(&h[h.len()-4..]).len() as u64;
    let max_line=h.iter().map(|v|v.to_string().len()+1).max().unwrap() as u64;
    let budget=max_line+100;
    assert!(tail_bytes<=budget,"fixture tail must fit physical budget");
    let mut offset=0;
    for (index,line) in h.iter().enumerate() {
        let end=offset+line.to_string().len()+1;
        println!("AUDIT_WINDOW_INPUT {}",json!({"case":id,"ordinal":index,"range":[offset,end],"payload":line["payload"],"segment_budget":budget}));
        offset=end;
    }
    let mut q=request(TargetAnalyzeMode::Preview);
    q.resource_limits=Some(TargetResourceLimits{tail_bytes:Some(tail_bytes),max_segment_bytes:Some(budget),max_line_bytes:Some(max_line),..Default::default()});
    let mut p=Process::new(f);let tail=p.run(id,q.clone());
    check(id,"tail_exact_latest",json!(texts(&tail)),json!(["U4","A4"]));
    q.mode=TargetAnalyzeMode::Backfill;q.header.request_id="backfill".into();q.job_id="backfill-job".into();
    q.persisted_anchor=None;q.cursor=None;
    println!("AUDIT_PHASE {}",json!({"case":id,"phase":"public_independent_backfill","request":q}));
    let v=p.run(id,q.clone());
    let source=read_target_source(&q,&f.startup(),&AtomicBool::new(false))
        .unwrap_or_else(|e|panic!("infrastructure {id}/repeat source evidence: {e:?}"));
    check(id,"at_least_three_physical_windows",json!(source.segments.len()>=3),json!(true));
    let ranges:Vec<_>=source.segments.iter().map(|s|json!([s.scanned_range.start,s.scanned_range.end])).collect();
    println!("AUDIT_WINDOWS {}",json!({"case":id,"ranges":ranges}));
    let mut earliest=offset as u64;
    for s in &source.segments {
        check(id,"backward_progress",json!(s.scanned_range.start<earliest && s.scanned_range.end>=earliest),json!(true));
        earliest=s.scanned_range.start;
    }
    check(id,"reached_root",json!(earliest),json!(0));
    q.header.request_id="backfill-retry".into();let retry=p.run(id,q);
    check(id,"retry_history",retry["payload"]["history_items"].clone(),v["payload"]["history_items"].clone());
    // The public protocol exposes no command to replay only physical W2.
    // Whole-request retry above is separately labelled; W2 replay is not claimed.
    println!("AUDIT_LIMITATION {}",json!({"case":id,"field":"physical_W2_replay","reason":"no public physical-segment replay request; whole-request retry is separate"}));
    v
}
fn internal_windows(id: &str,f: &Fixture,h: &[Value]) {
    println!("AUDIT_PHASE {}",json!({"case":id,"phase":"formal_internal_windows"}));
    let bytes=encode(h);let hash=SourceFixtureHash::from_bytes(bytes.as_bytes());
    let path=f.root.join(format!("2026/08/26/rollout-2026-08-26T00-00-00-{A}.jsonl"));
    let spec=SourceSpec::bind(A,A,path).unwrap().with_source_epoch("audit-internal").unwrap()
        .with_fingerprint(SourceFingerprint::new(hash.algorithm(),hash.digest(),hash.byte_length()).unwrap())
        .with_prefix_anchor(SourcePrefixAnchor::new(hash.algorithm(),hash.digest(),hash.byte_length()).unwrap());
    let mut boundaries=vec![0u64];for row in h {boundaries.push(boundaries.last().unwrap()+row.to_string().len() as u64+1);}
    let tail=h.len()-4;let mut ranges=vec![(tail,h.len()-1)];
    ranges.extend((0..tail).rev().map(|i|(i,i+1)));ranges.push((h.len()-1,h.len()));
    let profile=CompatibilityProfile::Current;
    let mut adapter=CodexEventAdapter::new_with_conversation_id(profile,Some(A.into()));
    let mut reducer=AnalysisReducer::new(Some(A.into()));let mut assembler=SegmentAssembler::default();
    let mut previous=boundaries[tail];let mut replayed=0;
    let mut ordered_records=BTreeMap::new();let mut assembly_available=true;
    for (sequence,(start,end)) in ranges.into_iter().enumerate() {
        let range=SourceByteRange::new(boundaries[start],boundaries[end]).unwrap();
        let plan=JsonlSourceBackend.plan_range(&spec,SourceReadMode::BackwardRange,range).unwrap();
        let mut records=vec![];
        let report=plan.read(&JsonlSourceBackend,&mut |r|{records.push(r);Ok(())}).unwrap();
        check(id,"internal_exact_range",json!([report.complete_range().unwrap().start(),report.complete_range().unwrap().end()]),json!([boundaries[start],boundaries[end]]));
        if start<tail {
            check(id,"internal_backward_progress",json!(boundaries[end]==previous && boundaries[start]<previous),json!(true));previous=boundaries[start];
        }
        println!("AUDIT_WINDOWS {}",json!({"case":id,"phase":"internal","range":[boundaries[start],boundaries[end]],"ordinals":[start,end],"record_count":records.len()}));
        for record in &records {
            ordered_records.insert((record.source_identity.clone(),record.byte_start),record.clone());
        }
        let segment=match SegmentDescriptor::from_records(format!("{id}-{start}"),&spec,plan.snapshot_boundary(),report.complete_range().unwrap(),&records,sequence as u64+1,SegmentCompleteness::Complete) {
            Ok(descriptor)=>{
                let segment=SourceSegment::new(descriptor,records.clone(),vec![]).unwrap();
                assembler.add_segment(segment.clone()).unwrap();Some(segment)
            },
            Err(SegmentError::InvalidRolloutOrdinalRange) if start==0 && end==1 && records.len()==1
                && records[0].rollout_ordinal==Some(0) && records[0].physical_line_ordinal==1
                && records[0].byte_start==0 && records[0].byte_end==boundaries[1]
                && records[0].raw.as_ref().map(|v|v["type"]=="session_meta").unwrap_or(false)=>{
                let actual=json!({"api":"SegmentDescriptor::from_records","variant":"InvalidRolloutOrdinalRange",
                    "range":[records[0].byte_start,records[0].byte_end],"ordinal":records[0].rollout_ordinal});
                let expected=json!("target DATA permits ordinal 0; formal descriptor integration remains unavailable");
                println!("AUDIT_OBSERVATION {}",json!({"case":id,"field":"internal_ordinal_boundary","actual":actual,"expected":expected}));
                println!("AUDIT_ASSERT {}",json!({"case":id,"field":"internal_ordinal_boundary","actual":actual,"expected":expected,"classification":"typed-boundary"}));
                DIFFERENCES.with(|d|d.borrow_mut().push(format!("{id}/internal_ordinal_boundary")));
                assembly_available=false;None
            },
            Err(e)=>panic!("infrastructure {id}/descriptor: {e:?}")
        };
        let batch=analyze_records_with_adapter(&adapter,records.clone(),profile,BatchCompleteness::Partial);
        reducer.apply_batch(&batch);
        if sequence==0 {
            let state=adapter.checkpoint_state();check(id,"internal_active_T4",state["active_turn_id"].clone(),json!("T4"));
            let restored=CodexEventAdapter::new_with_conversation_id(profile,Some(A.into()));
            restored.restore_checkpoint_state(&state).unwrap();adapter=restored;
            reducer=serde_json::from_value(serde_json::to_value(&reducer).unwrap()).unwrap();
        }
        // Repeat the actual question window (or the tool completion window)
        // using the same source range; no fabricated wire delivery is involved.
        let repeat=h[start]["payload"]["type"]=="request_user_input" || h[start]["payload"]["id"]=="R31"
            || h[start]["payload"]["client_id"]=="X31" || h[start]["payload"]["id"]=="O2";
        if repeat {
            let before=json!(reducer.snapshot());
            let mut again=vec![];plan.read(&JsonlSourceBackend,&mut |r|{again.push(r);Ok(())}).unwrap();
            let duplicate=analyze_records_with_adapter(&adapter,again,profile,BatchCompleteness::Partial);
            reducer.apply_batch(&duplicate);
            if let Some(segment)=segment { assembler.add_segment(segment).unwrap(); }
            else { unavailable(id,"internal_assembly_replay","descriptor rejected; Adapter/Reducer replay still executed"); }
            replayed+=1;
            check(id,"internal_window_replay_idempotent",json!(reducer.snapshot()),before);
        }
    }
    check(id,"internal_reached_root",json!(previous),json!(0));
    check(id,"internal_replay_count",json!(replayed),json!(if id=="R09" {3} else {1}));
    println!("AUDIT_PHASE {}",json!({"case":id,"phase":"internal_terminal_consumed","status":"executed"}));
    if assembly_available {
    let assembly=assembler.assemble();
    check(id,"internal_assembly_complete",json!(assembly.completeness()==SegmentCompleteness::Complete),json!(true));
    check(id,"internal_no_gap",json!(assembly.gaps().is_empty()),json!(true));
    match assembly.promote_to_forward_append(&spec) {
        Ok(cursor)=>check(id,"internal_promotion_range",json!([cursor.metadata().complete_range().start(),cursor.metadata().complete_range().end()]),json!([0,bytes.len()])),
        Err(e)=>check(id,"internal_promotion",json!(e.to_string()),json!("safe complete promotion"))
    }
    } else {
        unavailable(id,"internal_assembly_complete","ordinal 0 descriptor rejected; incomplete assembly cannot establish completeness or gaps");
        unavailable(id,"internal_promotion","ordinal 0 descriptor rejected; safe complete assembly prerequisite unavailable");
    }
    let fresh=CodexEventAdapter::new_with_conversation_id(profile,Some(A.into()));
    let canonical=analyze_records_with_adapter(&fresh,ordered_records.into_values(),profile,BatchCompleteness::Canonical);
    let ordered=json!({"payload":{"history_items":canonical.items}});
    let expected=if id=="R02" {vec!["U1","A1","U2","检查完成","检查完成","A2","U3","A3","U4","A4"].into_iter().map(str::to_owned).collect()} else {expected_texts(4)};
    // Plan actions are separate objects, not additional ordinary messages.
    check(id,"internal_ordered_body",json!(texts(&ordered)),json!(expected));
    if id=="R02" {
        let keys:Vec<_>=items(&ordered).iter().filter(|e|e["payload"]["text"]=="检查完成")
            .map(|e|e["payload"]["metadata"]["item_key"].as_str().unwrap().to_owned()).collect();
        check(id,"internal_same_text_two_keys",json!(keys.iter().collect::<BTreeSet<_>>().len()),json!(2));
    }
    println!("AUDIT_PHASE {}",json!({"case":id,"phase":"independent_ordered_reference","status":"executed"}));
    let projected=json!(reducer.snapshot());
    for (text,turn) in [("A1","T1"),("A2","T2")] {
        let owners:Vec<_>=projected["turns"].as_array().unwrap().iter().flat_map(|t|t["items"].as_array().unwrap())
            .filter(|i|i["content"]==text).map(|i|i["turn_id"].clone()).collect();
        check(id,&format!("internal_restored_{text}_owner"),json!(owners),json!([turn]));
    }
    if id=="R09" {
        let plans:Vec<_>=projected["turns"].as_array().unwrap().iter().flat_map(|t|t["items"].as_array().unwrap())
            .filter(|i|i["kind"].as_str().unwrap_or("").starts_with("plan")).collect();
        check(id,"internal_seven_plan_items",json!(plans.len()),json!(7));
        let answers:Vec<_>=plans.iter().filter(|i|!i["answer"].is_null()).map(|i|i["answer"]["answer"].clone()).collect();
        check(id,"internal_two_answers",json!(answers),json!(["方案一","改为方案二"]));
        let questions:Vec<_>=plans.iter().filter(|i|!i["question"].is_null()).collect();
        check(id,"internal_one_question",json!(questions.len()),json!(1));
        if let Some(question)=questions.first() {
            let links:Vec<_>=plans.iter().filter(|i|!i["answer"].is_null() || !i["plan_action"].is_null()).map(|i|i["related_item_key"].clone()).collect();
            check(id,"internal_four_question_links",json!(links),json!(vec![question["item_key"].clone();4]));
        }
        let updates:Vec<_>=plans.iter().filter(|i|!i["plan"].is_null()).collect();
        check(id,"internal_latest_plan",updates.last().map(|i|i["plan"]["explanation"].clone()).unwrap_or(Value::Null),json!("PU32"));
    } else {
        let tools:Vec<_>=projected["turns"].as_array().unwrap().iter().flat_map(|t|t["items"].as_array().unwrap()).filter(|i|!i["tool"].is_null()).collect();
        check(id,"internal_one_tool",json!(tools.len()),json!(1));
        if let Some(tool)=tools.first() {
            check(id,"internal_tool_owner",tool["turn_id"].clone(),json!("T2"));
            check(id,"internal_tool_output",tool["tool"]["output"].clone(),json!("AUDIT_TOOL_RESULT"));
        }
    }
    println!("AUDIT_PHASE {}",json!({"case":id,"phase":"restored_incremental_reducer","status":"executed"}));
}
#[test] fn r03_append_after_snapshot() {
    let f=Fixture::new(); let path=f.write(A,26,&history(4)); let mut p=Process::new(&f);
    let q=request(TargetAnalyzeMode::Append); let first=p.batch("R03",q);
    let more=ordinalize(turn(5,"",true),17);
    fs::OpenOptions::new().append(true).open(path).unwrap().write_all(encode(&more).as_bytes()).unwrap();
    // The first snapshot is captured and awaiting ACK; growth precedes Complete.
    p.ack(&first,true);
    let v=p.finish("R03","read-1","audit-job",vec![json!(first.payload)]);
    check_texts("R03",&v,4);
    let mut q=request(TargetAnalyzeMode::Append); q.header.request_id="append".into();q.job_id="append-job".into();continue_from(&mut q,&v);
    let after=p.run("R03",q);
    let old_keys:Vec<_>=items(&v).iter().filter(|e|matches!(e["event_type"].as_str(),Some("UserMessage"|"AssistantMessage")))
        .map(|e|e["payload"]["metadata"]["item_key"].clone()).collect();
    let projected_keys:Vec<_>=after["payload"]["projection"]["turns"].as_array().unwrap().iter().take(4)
        .flat_map(|t|t["items"].as_array().unwrap()).filter(|i|matches!(i["kind"].as_str(),Some("user_message"|"assistant_message")))
        .map(|i|i["item_key"].clone()).collect();
    check("R03","old_keys_unchanged",json!(projected_keys),json!(old_keys));
    check("R03","append_exact_delta",json!(texts(&after)),json!(["U5","A5"]));
    check("R03","raw_append_delta",json!(body_texts(after["raw_history"].as_array().unwrap())),json!(["U5","A5"]));
    let mut ordered=texts(&v);ordered.extend(texts(&after));
    check("R03","merged_order",json!(ordered),json!(expected_texts(5)));
    let mut all=BTreeMap::new();
    for e in items(&v).into_iter().chain(items(&after)) {
        if matches!(e["event_type"].as_str(),Some("UserMessage"|"AssistantMessage")) {
            all.insert(e["payload"]["metadata"]["item_key"].as_str().unwrap().to_string(),e["payload"]["text"].clone());
        }
    }
    check("R03","logical_body_count",json!(all.len()),json!(10));
    let mut actual:Vec<_>=all.values().cloned().collect();actual.sort_by_key(|v|v.to_string());
    let mut expected:Vec<_>=expected_texts(5).into_iter().map(Value::String).collect();expected.sort_by_key(|v|v.to_string());
    check("R03","merged_content",json!(actual),json!(expected));
    let mut q=request(TargetAnalyzeMode::Append);q.header.request_id="append-empty".into();q.job_id="empty-job".into();continue_from(&mut q,&after);
    let empty=p.run("R03",q);check("R03","no_duplicate_append",json!(texts(&empty)),json!([]));
}
fn body_texts(events: &[Value]) -> Vec<String> {
    events.iter().filter(|e|matches!(e["event_type"].as_str(),Some("UserMessage"|"AssistantMessage")))
        .map(|e|e["payload"]["text"].as_str().unwrap().to_owned()).collect()
}
#[test] fn r04_empty_source() {
    let f=Fixture::new(); f.write(A,26,&history(0));
    let v=expected_success("R04",mapped(&f,&request(TargetAnalyzeMode::Preview)));
    check_texts("R04",&v,0);check("R04","outcomes",v["payload"]["task_outcomes"].clone(),json!([]));
    check("R04","complete",v["payload"]["complete"].clone(),json!(true));
}
#[test] fn r05_source_not_yet_created() {
    let f=Fixture::new(); let result=mapped(&f,&request(TargetAnalyzeMode::Preview));
    match result {
        Err(TargetSourceReadError::Discovery(LineageError::ConversationRolloutMissing { conversation_id }))=>
            check("R05","missing_conversation",json!(conversation_id),json!(A)),
        Err(e)=>panic!("infrastructure R05/source: {e:?}"),
        Ok(v)=>check("R05","missing_not_empty_success",v,json!("conversation source missing"))
    }
}
fn rich(extra: Vec<Value>) -> Fixture {
    let f=Fixture::new(); let mut h=history(4);h.splice(7..7,extra);f.write(A,26,&ordinalize(h,0));f
}
fn tool_input() -> Vec<Value> {
    vec![line("response_item",json!({"type":"function_call","id":"C2","call_id":"C2","name":"shell_command",
        "arguments":"{\"command\":\"pwsh -File C:/audit/run.ps1\",\"workdir\":\"C:/audit\"}"})),
        line("response_item",json!({"type":"function_call_output","id":"O2","call_id":"C2","output":"AUDIT_TOOL_RESULT"}))]
}
#[test] fn r06_tool_details() {
    let f=Fixture::new();let mut h=history(4);h.splice(7..7,tool_input());prepare_windows(&mut h);
    let h=ordinalize(h,0);f.write(A,26,&h);let v=window_history("R06",&f,&h);
    let started=event_items(&v,"ToolStarted");let ended=event_items(&v,"ToolCompleted");
    check("R06","one_begin",json!(started.len()),json!(1));check("R06","one_end",json!(ended.len()),json!(1));
    if started.len()!=1 || ended.len()!=1 { unavailable("R06","tool_fields","begin/end cardinality failed");return; }
    check("R06","call",ended[0]["payload"]["call_id"].clone(),json!("C2"));
    check("R06","turn",ended[0]["payload"]["metadata"]["turn_id"].clone(),json!("T2"));
    check("R06","output",ended[0]["payload"]["output"].clone(),json!("AUDIT_TOOL_RESULT"));
    let input:Value=serde_json::from_str(started[0]["payload"]["input"].as_str().unwrap()).unwrap();
    check("R06","command_and_cwd",input,json!({"command":"pwsh -File C:/audit/run.ps1","workdir":"C:/audit"}));
    check("R06","detail_count",json!(v["payload"]["tool_details"].as_array().unwrap().len()),json!(1));
    check("R06","detail_output",v["payload"]["tool_details"][0]["output"].clone(),json!("AUDIT_TOOL_RESULT"));
    check("R06","detail_call",v["payload"]["tool_details"][0]["call_id"].clone(),json!("C2"));
}
#[test] fn r07_file_changes() {
    let changes=json!({"C:/audit/a.rs":{"type":"update","unified_diff":"@@ -1 +1,2 @@\n-old\n+new\n+two","move_path":null},
        "C:/audit/b.rs":{"type":"update","unified_diff":"@@ -1,2 +1,3 @@\n-old\n-old2\n+n1\n+n2\n+n3","move_path":null}});
    let f=rich(vec![event(json!({"type":"item_completed","thread_id":A,"turn_id":"T2",
        "item":{"type":"FileChange","id":"FC2","changes":changes,"status":"completed"}}))]);
    let v=expected_success("R07",mapped(&f,&request(TargetAnalyzeMode::Backfill)));
    let mut paths:Vec<_>=event_items(&v,"FileChanged").iter().map(|e|e["payload"]["path"].clone()).collect();
    paths.sort_by_key(|v|v.to_string());
    check("R07","exact_file_paths",json!(paths),json!(["C:/audit/a.rs","C:/audit/b.rs"]));
    for e in event_items(&v,"FileChanged") {
        check("R07","file_turn",e["payload"]["metadata"]["turn_id"].clone(),json!("T2"));
        check("R07","file_source_ordinal",e["payload"]["metadata"]["source_ref"]["rollout_ordinal"].clone(),json!(7));
    }
    // The current model has no dedicated diff field. Search only delivered
    // history/detail/projection content, not fixture logs or checkpoint state.
    let delivered=json!([v["payload"]["history_items"],v["payload"]["tool_details"],v["payload"]["projection"]]);
    for diff in ["@@ -1 +1,2 @@\n-old\n+new\n+two","@@ -1,2 +1,3 @@\n-old\n-old2\n+n1\n+n2\n+n3"] {
        check("R07","exact_diff_retained",json!(contains_string(&delivered,diff)),json!(true));
    }
}
fn contains_string(v: &Value,expected: &str) -> bool {
    match v { Value::String(s)=>s.contains(expected), Value::Array(a)=>a.iter().any(|x|contains_string(x,expected)),
        Value::Object(o)=>o.values().any(|x|contains_string(x,expected)), _=>false }
}
#[test] fn r08_completed_command() {
    let f=rich(vec![event(json!({"type":"item_completed","thread_id":A,"turn_id":"T2","item":{
        "type":"CommandExecution","id":"CMD2","command":["pwsh","-File","C:/audit/run.ps1"],"cwd":"file:///C:/audit",
        "parsed_cmd":[],"source":"agent","status":"completed","stdout":"CMD_RESULT","stderr":"",
        "aggregated_output":"CMD_RESULT","exit_code":0}}))]);
    let v=expected_success("R08",mapped(&f,&request(TargetAnalyzeMode::Backfill)));
    let done=event_items(&v,"ToolCompleted");
    check("R08","one_completed_command",json!(done.len()),json!(1));
    if done.len()!=1 { unavailable("R08","command_fields","no unique completed command");return; }
    check("R08","output",done[0]["payload"]["output"].clone(),json!("CMD_RESULT"));
    check("R08","command_turn",done[0]["payload"]["metadata"]["turn_id"].clone(),json!("T2"));
    let details=v["payload"]["tool_details"].as_array().unwrap();
    check("R08","one_detail",json!(details.len()),json!(1));
    if details.len()!=1 { unavailable("R08","command_detail","no unique detail");return; }
    check("R08","detail_output",details[0]["output"].clone(),json!("CMD_RESULT"));
    let input=details[0]["input"].as_str().unwrap_or("");
    check("R08","command_exact",json!(input),json!("pwsh -File C:/audit/run.ps1"));
    let tools:Vec<_>=v["payload"]["projection"]["turns"].as_array().unwrap().iter()
        .flat_map(|t|t["items"].as_array().unwrap()).filter(|i|!i["tool"].is_null()).collect();
    check("R08","one_projected_tool",json!(tools.len()),json!(1));
    if tools.len()!=1 { unavailable("R08","command_status","no unique projected tool");return; }
    check("R08","command_completed",tools[0]["tool"]["completed"].clone(),json!(true));
}
#[test] fn r09_multiple_plan_answers() {
    let mut extra=vec![];
    for (id,status) in [("PU31","pending"),("PU32","completed")] {
        // PlanUpdate rejects an id field; its physical ordinal distinguishes
        // versions. Answer and action native IDs remain explicit below.
        extra.push(event(json!({"type":"plan_update","explanation":id,
            "plan":[{"step":"读文件","status":status},{"step":"修改","status":if id=="PU31" {"pending"} else {"in_progress"}}]})));
    }
    extra.push(event(json!({"type":"request_user_input","turn_id":"T3","call_id":"P31","questions":[
        {"id":"Q31","header":"方案","question":"采用方案？","options":[{"label":"确认","description":"确认"},{"label":"继续","description":"继续"}]}],"isBlocking":true})));
    for (id,answer,actid,action) in [("R31","方案一","X31","确认"),("R32","改为方案二","X32","继续")] {
        extra.push(line("response_item",json!({"type":"function_call_output","id":id,"call_id":"P31",
            "output":json!({"answers":{"Q31":{"answers":[answer]}}}).to_string()})));
        extra.push(event(json!({"type":"user_message","client_id":actid,"message":action,"images":null,"image_details":[],"local_images":[]})));
    }
    let f=Fixture::new();let mut h=history(4);h.splice(11..11,extra);prepare_windows(&mut h);
    let h=ordinalize(h,0);f.write(A,26,&h);let v=window_history("R09",&f,&h);
    let plans:Vec<_>=items(&v).into_iter().filter(|e|e["event_type"].as_str().unwrap().starts_with("Plan")).collect();
    check("R09","seven_plan_items",json!(plans.len()),json!(7));
    let questions=event_items(&v,"PlanQuestion");check("R09","one_question",json!(questions.len()),json!(1));
    if questions.len()!=1 { unavailable("R09","question_links","no unique question");return; }
    let question=questions[0]["payload"]["metadata"]["item_key"].clone();
    let links:Vec<_>=plans.iter().filter(|e|e["event_type"]=="PlanAnswer"||e["event_type"]=="PlanAction")
        .map(|e|e["payload"]["metadata"]["related_item_key"].clone()).collect();
    check("R09","four_question_links",json!(links),json!(vec![question;4]));
    check("R09","answers",json!(event_items(&v,"PlanAnswer").iter().map(|e|e["payload"]["answer"].clone()).collect::<Vec<_>>()),json!(["方案一","改为方案二"]));
    let updates=event_items(&v,"PlanUpdated");
    check("R09","plan_versions",json!(updates.iter().map(|e|e["payload"]["explanation"].clone()).collect::<Vec<_>>()),json!(["PU31","PU32"]));
    check("R09","latest_plan_steps",updates.last().map(|u|u["payload"]["steps"].clone()).unwrap_or(Value::Null),
        json!([{"step":"读文件","status":"completed"},{"step":"修改","status":"in_progress"}]));
}
#[test] fn r10_per_turn_usage() {
    let mut h=vec![header(A)];
    for n in 1..=4 {
        let mut t=turn(n,"",true);let terminal=t.pop().unwrap();h.extend(t);
        for amount in if n==2 {vec![5,20]} else {vec![n*10]} {
            let usage=json!({"input_tokens":amount,"cached_input_tokens":0,"output_tokens":amount/5,"reasoning_output_tokens":0,"total_tokens":amount+amount/5});
            h.push(event(json!({"type":"token_count","info":{"total_token_usage":usage,"last_token_usage":usage,"model_context_window":128000},
                "rate_limits":{"primary":{"used_percent":amount,"window_minutes":300,"resets_at":1893456000},
                "secondary":{"used_percent":amount+1,"window_minutes":10080,"resets_at":1894060800}}})));
        }
        h.push(terminal);
    }
    let f=Fixture::new();f.write(A,26,&ordinalize(h,0));
    let v=expected_success("R10",mapped(&f,&request(TargetAnalyzeMode::Backfill)));
    let usage=event_items(&v,"UsageUpdated");
    check("R10","usage_update_sequence",json!(usage.iter().map(|e|json!([e["payload"]["metadata"]["turn_id"],e["payload"]["input_tokens"],e["payload"]["output_tokens"]])).collect::<Vec<_>>()),
        json!([["T1",10,2],["T2",5,1],["T2",20,4],["T3",30,6],["T4",40,8]]));
    let turns=v["payload"]["projection"]["turns"].as_array().unwrap();
    check("R10","four_projected_turns",json!(turns.iter().map(|t|t["turn_id"].clone()).collect::<Vec<_>>()),json!(["T1","T2","T3","T4"]));
    for (i,t) in turns.iter().enumerate() {
        let amount=(i+1)*10;
        check("R10",&format!("T{}_final_usage",i+1),t["usage"].clone(),json!({"input_tokens":amount,"cached_input_tokens":0,"output_tokens":amount/5,"reasoning_output_tokens":0,"total_tokens":amount+amount/5}));
        check("R10",&format!("T{}_rates",i+1),t["rate_limit"].clone(),json!({"primary_used_percent":amount as f64,"primary_window_minutes":300,"primary_resets_at":1893456000i64,
            "secondary_used_percent":(amount+1) as f64,"secondary_window_minutes":10080,"secondary_resets_at":1894060800i64}));
    }
    check("R10","target_last_turn_usage",json!([v["payload"]["usage"]["input_tokens"],v["payload"]["usage"]["output_tokens"]]),json!([40,8]));
    let retry=expected_success("R10",mapped(&f,&request(TargetAnalyzeMode::Backfill)));
    check("R10","retry_projection",retry["payload"]["projection"].clone(),v["payload"]["projection"].clone());
}
#[test] fn r11_failure_not_success() {
    let mut h=history(4);h.last_mut().unwrap()["payload"]["error"]=json!({"message":"AUDIT_FAILURE"});
    let f=Fixture::new();f.write(A,26,&h);let v=expected_success("R11",mapped(&f,&request(TargetAnalyzeMode::Backfill)));
    let terminal=event_items(&v,"TurnCompleted");let t=terminal.iter().find(|e|e["payload"]["metadata"]["turn_id"]=="T4");
    check("R11","terminal_present",json!(t.is_some()),json!(true));
    let Some(t)=t else {unavailable("R11","failed_outcome","T4 terminal missing");return;};
    check("R11","failed_status",t["payload"]["status"].clone(),json!("failed"));
    let key=&t["payload"]["metadata"]["item_key"];
    let outcomes=v["payload"]["task_outcomes"].as_array().unwrap();
    check("R11","four_outcomes",json!(outcomes.len()),json!(4));
    let outcome=outcomes.iter().find(|o|o["item_key"]==*key);
    check("R11","outcome_present",json!(outcome.is_some()),json!(true));
    let Some(outcome)=outcome else {unavailable("R11","failed_outcome_fields","outcome missing");return;};
    check("R11","failed_outcome",outcome["status"].clone(),json!("failed"));
    check("R11","failure_reason",json!(contains_string(outcome,"AUDIT_FAILURE")),json!(true));
    check_texts("R11",&v,4);
}
#[test] fn r12_unknown_events() {
    let mut h=history(4);
    for typ in ["audit_future","thread_goal_updated","SubAgentActivity"] {h.push(event(json!({"type":typ,"id":typ}))); }
    h.push(message("assistant","codex_delegation refers to B","REF","T4"));
    let f=Fixture::new();f.write(A,26,&ordinalize(h,0));
    let v=expected_success("R12",mapped(&f,&request(TargetAnalyzeMode::Backfill)));
    check("R12","unknown_count",json!(event_items(&v,"UnknownEvent").len()),json!(3));
    check("R12","partial",v["payload"]["complete"].clone(),json!(false));
    let mut expected=expected_texts(4);expected.push("codex_delegation refers to B".into());
    check("R12","known_text",json!(texts(&v)),json!(expected));
    check("R12","only_target",json!(items(&v).iter().all(|e|e["payload"]["metadata"]["conversation_id"]==A)),json!(true));
}
fn child_lines(parent: &str, parent_lines: &[Value], suffix: &str, terminal: bool) -> Vec<Value> {
    let cut=5usize; // header + the four records of retained T1.
    let mut meta=header(A);
    meta["payload"]["history_mode"]=json!("paginated");
    meta["payload"]["history_base"]=json!({"thread_id":parent,"end_ordinal_exclusive":5,
        "end_byte_offset":encode(&parent_lines[..cut]).len()});
    let mut v=vec![meta];v.extend(turn(2,suffix,terminal));ordinalize(v,5)
}
fn lineage_case(id: &str,terminal: bool,skip: bool) {
    let f=Fixture::new();let root=history(2);let path=f.write(A,24,&root);
    let mut p=Process::new(&f);let initial=p.run(id,request(TargetAnalyzeMode::Append));drop(p);
    let child=child_lines(A,&root,"b",terminal);f.write(CHILD,25,&child);
    if skip {
        // c points to b at its header boundary; b's parent retains T1.
        let mut c=header(A);c["payload"]["history_mode"]=json!("paginated");
        c["payload"]["history_base"]=json!({"thread_id":CHILD,"end_ordinal_exclusive":6,"end_byte_offset":encode(&child[..1]).len()});
        let mut v=vec![c];v.extend(turn(2,"c",true));f.write(HEAD,26,&ordinalize(v,6));
    }
    let mut q=request(TargetAnalyzeMode::Append);q.header.request_id="resend".into();q.job_id="resend-job".into();continue_from(&mut q,&initial);
    let source=read_target_source(&q,&f.startup(),&AtomicBool::new(false)).unwrap();
    check(id,"discovered_source_ids",json!(source.discovered_sources.iter().map(|s|s.rollout_id.clone()).collect::<BTreeSet<_>>()),
        json!(if skip {vec![A,CHILD,HEAD]} else {vec![A,CHILD]}));
    let mut p=Process::new(&f);let v=p.run(id,q);
    check(id,"parent_unchanged",json!(fs::read_to_string(path).unwrap()),json!(encode(&root)));
    if terminal {
        let replacements=v["payload"]["replacements"].as_array().unwrap();
        check(id,"replacement_count",json!(replacements.len()),json!(if skip {2} else {1}));
        let suffix=if skip {"c"} else {"b"};
        let projected:Vec<_>=v["payload"]["projection"]["turns"].as_array().unwrap().iter()
            .flat_map(|t|t["items"].as_array().unwrap()).filter(|i|matches!(i["kind"].as_str(),Some("user_message"|"assistant_message")))
            .map(|i|i["content"].clone()).collect();
        check(id,"effective_body_exact",json!(projected),json!(["U1","A1",format!("U2{suffix}").as_str(),format!("A2{suffix}").as_str()]));
        let chain=if skip {vec![A,CHILD,HEAD]} else {vec![A,CHILD]};
        check(id,"checkpoint_chain",v["checkpoint"]["lineage_checkpoint"]["chain_rollout_ids"].clone(),json!(chain));
        check(id,"checkpoint_head",v["checkpoint"]["lineage_checkpoint"]["active_head_rollout_id"].clone(),json!(if skip {HEAD} else {CHILD}));
        let edges:Vec<_>=v["payload"]["lineage_transitions"].as_array().unwrap().iter()
            .map(|e|json!([e["parent_rollout_id"],e["child_rollout_id"]])).collect();
        check(id,"exact_edges",json!(edges),if skip {json!([[A,CHILD],[CHILD,HEAD]])} else {json!([[A,CHILD]])});
        let replacement_edges:Vec<_>=replacements.iter().map(|r|json!([r["parent_rollout_id"],r["child_rollout_id"],r["replaced_turn_id"],r["replacement_turn_id"]])).collect();
        check(id,"replacement_identity",json!(replacement_edges),if skip {json!([[A,CHILD,"T2","T2b"],[CHILD,HEAD,"T2b","T2c"]])} else {json!([[A,CHILD,"T2","T2b"]])});
        let mutations:Vec<_>=v["payload"]["mutations"].as_array().unwrap().iter().filter(|m|m["mutation"]=="replace_last_turn").map(|m|m["replacement"].clone()).collect();
        check(id,"replacement_mutations_match",json!(mutations),json!(replacements));
    } else {
        check(id,"no_replacement",v["payload"]["replacements"].clone(),json!([]));
        check(id,"no_replace_mutation",json!(v["payload"]["mutations"].as_array().unwrap().iter().filter(|m|m["mutation"]=="replace_last_turn").count()),json!(0));
        check(id,"partial",v["payload"]["complete"].clone(),json!(false));
    }
}
#[test] fn r13_resend_completed() { lineage_case("R13",true,false); }
#[test] fn r14_resend_unfinished() { lineage_case("R14",false,false); }
#[test] fn r15_restart_skips_middle_head() { lineage_case("R15",true,true); }
#[test] fn r16_branch_isolation() {
    let f=Fixture::new();f.write(A,26,&history(2));
    let mut p=Process::new(&f);let before=p.run("R16",request(TargetAnalyzeMode::Backfill));
    let mut branch=history(1);branch[0]["payload"]["id"]=json!(B);f.write(B,26,&branch);
    let mut q=request(TargetAnalyzeMode::Backfill);q.header.request_id="branch".into();q.job_id="branch-job".into();q.conversation_id=B.into();
    let b=p.run("R16",q);check_texts("R16",&b,1);
    check("R16","branch_scope",json!(items(&b).iter().all(|e|e["payload"]["metadata"]["conversation_id"]==B)),json!(true));
    let mut q=request(TargetAnalyzeMode::Backfill);q.header.request_id="again-A".into();q.job_id="again-A-job".into();
    let after=p.run("R16",q);check("R16","A_unchanged",after["payload"]["history_items"].clone(),before["payload"]["history_items"].clone());
}
fn retry_case(id: &str,negative: bool) {
    let f=Fixture::new();f.write(A,26,&history(2));let mut p=Process::new(&f);
    let first=p.batch(id,request(TargetAnalyzeMode::Backfill));
    check_texts(id,&json!({"payload":first.payload}),2);
    check(id,"initial_conversation",json!(first.payload.conversation_id),json!(A));
    if negative {
        p.ack(&first,false);p.error(id,"batch_rejected","read-1");
    }
    drop(p);
    let mut p=Process::new(&f);let mut q=request(TargetAnalyzeMode::Backfill);q.header.request_id="retry".into();
    let b=p.batch(id,q);
    check(id,"batch_id",json!(b.batch_id),json!(first.batch_id));
    check(id,"segment_id",json!(b.segment_id),json!(first.segment_id));
    check(id,"items",json!(b.payload.history_items),json!(first.payload.history_items));
    check_texts(id,&json!({"payload":b.payload}),2);
    check(id,"retry_source_scope",json!([b.payload.conversation_id,b.payload.source_id,b.payload.source_epoch]),
        json!([A,first.payload.source_id,first.payload.source_epoch]));
    p.ack(&b,true);let result=p.finish(id,"retry","audit-job",vec![json!(b.payload)]);
    check_texts(id,&result,2);
}
#[test] fn r17_ack_loss_restart() { retry_case("R17",false); }
#[test] fn r18_negative_ack_retry() { retry_case("R18",true); }
#[test] fn r19_cancel_then_read() {
    let f=Fixture::new();f.write(A,26,&history(2));let mut p=Process::new(&f);
    let _b=p.batch("R19",request(TargetAnalyzeMode::Backfill));
    p.send(TargetMessage::Cancel(TargetCancelMessage::new("read-1","coordinator cancel")));
    p.error("R19","cancelled","read-1");
    let mut q=request(TargetAnalyzeMode::Backfill);q.header.request_id="after-cancel".into();
    let v=p.run("R19",q);check_texts("R19",&v,2);
}
#[test] fn r20_unfinished_line_resume() {
    let f=Fixture::new();let path=f.write(A,26,&history(4));let mut p=Process::new(&f);
    let v=p.run("R20",request(TargetAnalyzeMode::Append));
    let more=encode(&ordinalize(turn(5,"",true),17));let split=more.len()-1;
    fs::OpenOptions::new().append(true).open(&path).unwrap().write_all(&more.as_bytes()[..split]).unwrap();
    let mut q=request(TargetAnalyzeMode::Append);q.header.request_id="half".into();q.job_id="half-job".into();continue_from(&mut q,&v);
    let half=p.run("R20",q);
    let stable_end=encode(&history(4)).len()+more[..split].rfind('\n').map(|i|i+1).unwrap_or(0);
    let cursor=&half["payload"]["next_cursor"];
    if cursor.is_null() {
        check("R20","checkpoint_no_unsafe_cursor",json!(half["checkpoint"]["cursor"].is_null() ||
            half["checkpoint"]["cursor"]["complete_range"]["end"].as_u64().is_some_and(|end|end<=stable_end as u64)),json!(true));
    } else {
        check("R20","cursor_before_pending_line",json!(cursor["complete_range"]["end"].as_u64().is_some_and(|end|end<=stable_end as u64)),json!(true));
    }
    check("R20","half_exact_stable_body",json!(texts(&half)),json!(["U5","A5"]));
    check("R20","no_pending_terminal",json!(event_items(&half,"TurnCompleted").len()),json!(0));
    check("R20","half_not_complete",half["payload"]["complete"].clone(),json!(false));
    fs::OpenOptions::new().append(true).open(path).unwrap().write_all(b"\n").unwrap();
    let mut q=request(TargetAnalyzeMode::Append);q.header.request_id="whole".into();q.job_id="half-job".into();continue_from(&mut q,&v);
    let full=p.run("R20",q);
    check("R20","whole_complete",full["payload"]["complete"].clone(),json!(true));
    check("R20","retry_from_safe_cursor_exact_delta",json!(texts(&full)),json!(["U5","A5"]));
    check("R20","raw_complete_delta",json!(body_texts(full["raw_history"].as_array().unwrap())),json!(["U5","A5"]));
    check("R20","terminal_once",json!(event_items(&full,"TurnCompleted").len()),json!(1));
    check("R20","final_cursor_exact",full["payload"]["next_cursor"]["complete_range"]["end"].clone(),json!(encode(&history(4)).len()+more.len()));
    let mut q=request(TargetAnalyzeMode::Append);q.header.request_id="no-more".into();q.job_id="no-more-job".into();continue_from(&mut q,&full);
    let empty=p.run("R20",q);check("R20","no_more_body",json!(texts(&empty)),json!([]));
}
fn budget(id: &str,kind: &str,relation: i64,prefix: bool) {
    let f=Fixture::new();let mut h=if prefix {history(1)} else {history(0)};
    let mut long=message("assistant",&"x".repeat(1600),"LONG","T1");long["ordinal"]=json!(h.len());h.push(long);
    f.write(A,26,&h);
    let size=encode(&h).len() as u64;
    let longest=h.iter().map(|v|v.to_string().len() as u64+1).max().unwrap();
    // relation -1/0/+1 denotes input bytes relative to the chosen limit.
    let measured=if kind=="line" {longest} else {size};
    let limit=(measured as i64-relation) as u64;
    let mut q=request(TargetAnalyzeMode::Backfill);
    let mut limits=TargetResourceLimits{max_line_bytes:Some(longest+32),max_segment_bytes:Some(size+100),
        max_decoded_bytes:Some(size*3),..Default::default()};
    match kind {"line"=>limits.max_line_bytes=Some(limit),"segment"=>limits.max_segment_bytes=Some(limit),
        "decoded"=>limits.max_decoded_bytes=Some(limit),_=>unreachable!()}
    q.resource_limits=Some(limits);println!("AUDIT_BUDGET {}",json!({"case":id,"size":size,"longest_with_lf":longest,"limit":limit,"request":q}));
    let result=mapped(&f,&q);
    if relation<=0 {
        let v=expected_success(id,result);
        check(id,"long_item_retained",json!(texts(&v).contains(&"x".repeat(1600))),json!(true));
    } else if kind=="segment" {
        let v=expected_success(id,result);
        check(id,"segment_progress",json!(texts(&v).contains(&"x".repeat(1600))),json!(true));
    } else {
        let safe=match result {
            Err(error)=>{
                println!("AUDIT_LIMIT_ERROR {error}");
                assert!(resource_error(&error),"infrastructure {id}/budget source: {error:?}");
                true
            },
            Ok(v)=>{
                check(id,"oversize_item_not_published",json!(texts(&v).contains(&"x".repeat(1600))),json!(false));
                if let Some(end)=v["payload"]["next_cursor"]["complete_range"]["end"].as_u64() {
                    check(id,"safe_cursor_before_oversize",json!(end <= encode(&h[..h.len()-1]).len() as u64),json!(true));
                }
                v["payload"]["complete"]==false
            }
        };
        check(id,"over_limit_not_canonical",json!(safe),json!(true));
    }
}
#[test] fn r21_line_below_prefix(){budget("R21","line",-1,true)}
#[test] fn r22_line_equal_prefix(){budget("R22","line",0,true)}
#[test] fn r23_line_over_prefix(){budget("R23","line",1,true)}
#[test] fn r24_line_below_no_prefix(){budget("R24","line",-1,false)}
#[test] fn r25_line_equal_no_prefix(){budget("R25","line",0,false)}
#[test] fn r26_line_over_no_prefix(){budget("R26","line",1,false)}
#[test] fn r27_segment_below(){budget("R27","segment",-1,true)}
#[test] fn r28_segment_equal(){budget("R28","segment",0,true)}
#[test] fn r29_segment_over(){budget("R29","segment",1,true)}
#[test] fn r30_decoded_below(){budget("R30","decoded",-1,true)}
#[test] fn r31_decoded_equal(){budget("R31","decoded",0,true)}
#[test] fn r32_decoded_over(){budget("R32","decoded",1,true)}
