package com.termlink.app.codex.data

import org.json.JSONObject
import org.junit.Test
import org.junit.Assert.*

class CodexIpcWireModelTest {

    // ── CodexIpcStatus ─────────────────────────────────────────────────

    @Test
    fun `parse ipc status online`() {
        val json = JSONObject("""{"type":"codex_ipc_status","status":{"online":true,"clientId":"ipc-1"}}""")
        val status = CodexIpcStatus.from(json)
        assertTrue(status.online)
        assertEquals("ipc-1", status.clientId)
        assertNull(status.reason)
    }

    @Test
    fun `parse ipc status offline with reason`() {
        val json = JSONObject("""{"type":"codex_ipc_status","status":{"online":false,"reason":"disabled"}}""")
        val status = CodexIpcStatus.from(json)
        assertFalse(status.online)
        assertEquals("disabled", status.reason)
    }

    // ── DesktopSurfaceSnapshot ──────────────────────────────────────────

    @Test
    fun `parse surface snapshot with messages`() {
        val json = JSONObject("""
        {"type":"conversation_surface_snapshot","conversationId":"c1",
         "snapshot":{"conversationId":"c1","revision":3,"status":"running","updatedAt":1000,
         "latestTurnId":"t1",
         "items":[
           {"key":"m1","kind":"message","role":"user","text":"hello","turnId":"t1"},
           {"key":"m2","kind":"message","role":"assistant","phase":"final_answer","text":"world","turnId":"t1"},
           {"key":"s1","kind":"status","statusType":"commands","text":"已运行 2 条命令","turnId":"t1"}
         ]}}
        """)
        val snap = DesktopSurfaceSnapshot.from(json)
        assertEquals("c1", snap.conversationId)
        assertEquals(3, snap.revision)
        assertEquals("running", snap.status)
        assertEquals(3, snap.items.size)
        assertEquals("message", snap.items[0].kind)
        assertEquals("user", snap.items[0].role)
        assertEquals("hello", snap.items[0].text)
        assertEquals("message", snap.items[1].kind)
        assertEquals("assistant", snap.items[1].role)
        assertEquals("final_answer", snap.items[1].phase)
        assertEquals("status", snap.items[2].kind)
        assertEquals("commands", snap.items[2].statusType)
        assertNull(snap.pendingApproval)
        assertNull(snap.pendingPlanAction)
    }

    @Test
    fun `parse surface snapshot with pending approval`() {
        val json = JSONObject("""
        {"type":"conversation_surface_snapshot","conversationId":"c1",
         "snapshot":{"conversationId":"c1","revision":1,"status":"waiting_for_approval","updatedAt":2000,
         "items":[],
         "pendingApproval":{"kind":"command","requestId":"r1","title":"等待命令审批","command":"rm -rf","description":"dangerous","availableDecisions":["accept","reject"]}}}
        """)
        val snap = DesktopSurfaceSnapshot.from(json)
        assertEquals("waiting_for_approval", snap.status)
        assertNotNull(snap.pendingApproval)
        assertEquals("command", snap.pendingApproval!!.kind)
        assertEquals("r1", snap.pendingApproval!!.requestId)
        assertEquals("rm -rf", snap.pendingApproval!!.command)
        assertEquals(2, snap.pendingApproval!!.availableDecisions.size)
    }

    @Test
    fun `parse surface snapshot with pending plan action`() {
        val json = JSONObject("""
        {"type":"conversation_surface_snapshot","conversationId":"c1",
         "snapshot":{"conversationId":"c1","revision":1,"status":"waiting_for_input","updatedAt":3000,
         "items":[],
         "pendingPlanAction":{"kind":"plan_implementation","requestId":"rp","requestMethod":"item/plan/requestImplementation",
         "turnId":"t1","planContent":"BUILD","canSubmit":true}}}
        """)
        val snap = DesktopSurfaceSnapshot.from(json)
        assertNotNull(snap.pendingPlanAction)
        assertEquals("plan_implementation", snap.pendingPlanAction!!.kind)
        assertEquals("rp", snap.pendingPlanAction!!.requestId)
        assertEquals("BUILD", snap.pendingPlanAction!!.planContent)
        assertTrue(snap.pendingPlanAction!!.canSubmit)
    }

    @Test
    fun `parse surface snapshot without snapshot wrapper`() {
        // When the gateway sends snapshot directly (replay case).
        val json = JSONObject("""
        {"type":"conversation_surface_snapshot","conversationId":"c9","revision":1,"status":"completed","updatedAt":0,"items":[]}
        """)
        val snap = DesktopSurfaceSnapshot.from(json)
        assertEquals("c9", snap.conversationId)
        assertEquals("completed", snap.status)
    }

    // ── Client → Server builders ────────────────────────────────────────

    @Test
    fun `setActiveConversation builder`() {
        val msg = CodexClientMessages.setActiveConversation("conv-abc")
        val json = JSONObject(msg)
        assertEquals("set_active_conversation", json.getString("type"))
        assertEquals("conv-abc", json.getString("conversationId"))
    }

    @Test
    fun `followerSendMessage builder`() {
        val msg = CodexClientMessages.followerSendMessage("conv-1", "Hello from Android")
        val json = JSONObject(msg)
        assertEquals("follower_send_message", json.getString("type"))
        assertEquals("conv-1", json.getString("conversationId"))
        assertEquals("Hello from Android", json.getString("input"))
    }

    @Test
    fun `followerApprovalResponse builder`() {
        val msg = CodexClientMessages.followerApprovalResponse("conv-1", "req-42", "accept")
        val json = JSONObject(msg)
        assertEquals("follower_approval_response", json.getString("type"))
        assertEquals("conv-1", json.getString("conversationId"))
        assertEquals("req-42", json.getString("requestId"))
        assertEquals("accept", json.getString("decision"))
    }

    @Test
    fun `followerPlanResponse builder with requestId`() {
        val msg = CodexClientMessages.followerPlanResponse("conv-1", "是，实施此计划", "r-plan")
        val json = JSONObject(msg)
        assertEquals("follower_plan_response", json.getString("type"))
        assertEquals("是，实施此计划", json.getString("input"))
        assertEquals("r-plan", json.getString("requestId"))
    }

    @Test
    fun `followerPlanResponse builder without requestId`() {
        val msg = CodexClientMessages.followerPlanResponse("conv-1", "调整一下方案")
        val json = JSONObject(msg)
        assertEquals("follower_plan_response", json.getString("type"))
        assertFalse(json.has("requestId"))
    }

    // ── Unknown envelope ────────────────────────────────────────────────

    @Test
    fun `unknown envelope type parses safely`() {
        val json = JSONObject("""{"type":"unknown_msg","data":"x"}""")
        val env = CodexWsEnvelope.parse(json.toString())
        assertNotNull(env)
        assertEquals("unknown_msg", env!!.type)
    }
}
