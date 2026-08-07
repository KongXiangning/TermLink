package com.termlink.app.codex.data

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CodexHistoryWireTest {
    @Test
    fun oversizedEnvelopeIsRejectedBeforeJsonObjectConstruction() {
        val text = JSONObject()
            .put("type", "conversation_history_delta")
            .put("data", "x".repeat(CodexWsEnvelope.MAX_ENVELOPE_BYTES))
            .toString()
        assertFalse(CodexWsEnvelope.isWithinMaxEnvelopeBytes(text))
        assertNull(CodexWsEnvelope.parse(text))
    }

    @Test
    fun multibyteEnvelopeUsesUtf8ByteBudget() {
        val text = "{\"type\":\"codex_state\",\"data\":\"${"界".repeat(90_000)}\"}"
        assertTrue(text.length < CodexWsEnvelope.MAX_ENVELOPE_BYTES)
        assertFalse(CodexWsEnvelope.isWithinMaxEnvelopeBytes(text))
        assertNull(CodexWsEnvelope.parse(text))
    }

    @Test
    fun normalEnvelopeStillParsesAfterPreflight() {
        val envelope = CodexWsEnvelope.parse("{\"type\":\"codex_state\",\"status\":\"idle\"}")
        assertEquals("codex_state", envelope?.type)
    }

    @Test
    fun capabilityReadsRecoveryGenerationAndEnvelopeGate() {
        val status = JSONObject().put(
            "capabilities",
            JSONObject().put(
                "historySync",
                JSONObject()
                    .put("version", 1)
                    .put("recovery", true)
                    .put("selectionGeneration", true)
                    .put("perPageAck", true)
                    .put("payloadChunks", true)
                    .put("payloadChunkMaxBytes", 131072)
                    .put("maxEnvelopeBytes", 262144)
            )
        )
        val capability = CodexHistoryCapability.from(status)
        assertTrue(capability?.recovery == true)
        assertTrue(capability?.selectionGeneration == true)
        assertTrue(capability?.perPageAck == true)
        assertTrue(capability?.payloadChunks == true)
        assertEquals(262144, capability?.maxEnvelopeBytes)
    }

    @Test
    fun capabilityReadsRangeSegmentsWithoutChangingTopLevelVersion() {
        val status = JSONObject().put(
            "capabilities",
            JSONObject().put(
                "historySync",
                JSONObject()
                    .put("version", 1)
                    .put("rangeSegments", JSONObject()
                        .put("enabled", true)
                        .put("version", 1)
                        .put("cacheSchemaVersion", 3))
            )
        )
        val capability = CodexHistoryCapability.from(status)
        assertEquals(1, capability?.version)
        assertTrue(capability?.rangeSegments?.enabled == true)
        assertEquals(3, capability?.rangeSegments?.cacheSchemaVersion)
    }

    @Test
    fun manifestPageCarriesClientSelectionGenerationEvenWhenEmpty() {
        val message = JSONObject(
            CodexClientMessages.historyManifestPage(
                syncId = "sync",
                conversationId = "conversation",
                pageIndex = 0,
                lastPage = true,
                items = JSONArray(),
                selectionGeneration = 9
            )
        )
        assertEquals("conversation_history_manifest_page", message.getString("type"))
        assertEquals(9, message.getLong("clientSelectionGeneration"))
        assertTrue(message.getJSONArray("items").length() == 0)
    }

    @Test
    fun syncRequestAdvertisesAdditiveCacheSchemaV2() {
        val message = JSONObject(
            CodexClientMessages.historySyncRequest(
                CodexHistorySyncRequest(
                    syncId = "sync",
                    conversationId = "conversation",
                    checkpoint = CodexHistorySyncCheckpoint(null, 0, false),
                    cacheSchemaVersion = 2
                )
            )
        )
        assertEquals(2, message.getInt("cacheSchemaVersion"))
    }

    @Test
    fun syncRequestCarriesRangeCapabilityAndCheckpointAnchorsAdditively() {
        val message = JSONObject(
            CodexClientMessages.historySyncRequest(
                CodexHistorySyncRequest(
                    syncId = "sync",
                    conversationId = "conversation",
                    checkpoint = CodexHistorySyncCheckpoint(
                        rootHash = "root",
                        itemCount = 2,
                        complete = false,
                        rangeId = "range",
                        rangeKind = "tail",
                        newestAnchorKey = "new",
                        newestAnchorHash = "new-hash",
                        oldestAnchorKey = "old",
                        oldestAnchorHash = "old-hash",
                        nextOlderCursor = "cursor",
                        hasMoreBefore = true,
                        coverageComplete = false
                    ),
                    cacheSchemaVersion = 3,
                    rangeSegments = CodexHistoryRangeCapability(true, 1, 3)
                )
            )
        )
        assertEquals(1, message.getJSONObject("rangeSegments").getInt("version"))
        assertEquals(3, message.getInt("cacheSchemaVersion"))
        assertEquals("range", message.getJSONObject("checkpoint").getString("rangeId"))
        assertTrue(message.getJSONObject("checkpoint").getBoolean("hasMoreBefore"))
    }

    @Test
    fun syncRequestWithoutRangeKeepsLegacySchemaAndCheckpointShape() {
        val message = JSONObject(
            CodexClientMessages.historySyncRequest(
                CodexHistorySyncRequest(
                    syncId = "sync",
                    conversationId = "conversation",
                    checkpoint = CodexHistorySyncCheckpoint(null, 0, false),
                    cacheSchemaVersion = 3
                )
            )
        )
        assertEquals(2, message.getInt("cacheSchemaVersion"))
        assertFalse(message.has("rangeSegments"))
        assertFalse(message.getJSONObject("checkpoint").has("coverageComplete"))
    }

    @Test
    fun deltaParsesClientSelectionGenerationWithoutChangingPageHashInputs() {
        val json = JSONObject()
            .put("syncId", "sync")
            .put("conversationId", "conversation")
            .put("sequence", 1)
            .put("pageIndex", 0)
            .put("pageCount", 1)
            .put("pageHash", "hash")
            .put("baseRoot", JSONObject.NULL)
            .put("targetRoot", "root")
            .put("baselineComplete", true)
            .put("fullOrderIncluded", false)
            .put("upserts", JSONArray())
            .put("deletes", JSONArray())
            .put("clientSelectionGeneration", 9)
        val page = CodexHistoryDeltaWire.from(json)!!.page
        assertEquals(9, page.selectionGeneration)
        assertEquals(
            CodexHistoryPageHasher.pageHashPayload(page.copy(selectionGeneration = 0)),
            CodexHistoryPageHasher.pageHashPayload(page)
        )
    }

    @Test
    fun deltaParsesOptionalRangeMetadata() {
        val json = JSONObject()
            .put("syncId", "sync")
            .put("conversationId", "conversation")
            .put("sequence", 1)
            .put("pageIndex", 0)
            .put("pageCount", 1)
            .put("pageHash", "hash")
            .put("baseRoot", JSONObject.NULL)
            .put("targetRoot", "root")
            .put("baselineComplete", false)
            .put("fullOrderIncluded", false)
            .put("upserts", JSONArray())
            .put("deletes", JSONArray())
            .put("range", JSONObject()
                .put("version", 1)
                .put("segmentId", "range")
                .put("rangeId", "range")
                .put("rangeKind", "tail")
                .put("oldestAnchor", JSONObject().put("key", "old").put("hash", "old-hash"))
                .put("newestAnchor", JSONObject().put("key", "new").put("hash", "new-hash"))
                .put("nextOlderCursor", "cursor")
                .put("hasMoreBefore", true)
                .put("coverageComplete", false))
        val range = CodexHistoryDeltaWire.from(json)!!.page.range
        assertEquals("range", range?.rangeId)
        assertEquals("old", range?.oldestAnchor?.key)
        assertTrue(range?.hasMoreBefore == true)
    }

    @Test
    fun payloadChunkCarriesTargetRootAndGeneration() {
        val chunk = CodexHistoryPayloadChunkWire.from(
            JSONObject()
                .put("syncId", "sync")
                .put("conversationId", "conversation")
                .put("sequence", 1)
                .put("pageIndex", 2)
                .put("targetRoot", "root")
                .put("baselineComplete", true)
                .put("itemKey", "item")
                .put("chunkIndex", 0)
                .put("chunkCount", 2)
                .put("payloadHash", "a".repeat(64))
                .put("payloadBytes", 4)
                .put("data", "ab")
                .put("clientSelectionGeneration", 7)
        )!!.chunk
        assertEquals("root", chunk.targetRoot)
        assertEquals(2, chunk.chunkCount)
        assertEquals(7, chunk.selectionGeneration)
    }
}
