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
    fun capabilityReadsServerSnapshotSegmentsIndependentlyFromNativeRange() {
        val status = JSONObject().put(
            "capabilities",
            JSONObject().put(
                "historySync",
                JSONObject()
                    .put("version", 1)
                    .put("serverSnapshotSegments", JSONObject()
                        .put("enabled", true)
                        .put("version", 1)
                        .put("cacheSchemaVersion", 3)
                        .put("segmentTargetBytes", 98304)
                        .put("fragmentMaxBytes", 16384))
            )
        )
        val capability = CodexHistoryCapability.from(status)
        assertTrue(capability?.serverSnapshotSegments?.enabled == true)
        assertEquals(98304, capability?.serverSnapshotSegments?.segmentTargetBytes)
        assertEquals(16384, capability?.serverSnapshotSegments?.fragmentMaxBytes)
    }

    @Test
    fun capabilityReadsTailValidationAdditively() {
        val status = JSONObject().put(
            "capabilities",
            JSONObject().put(
                "historySync",
                JSONObject()
                    .put("version", 1)
                    .put("tailValidation", JSONObject()
                        .put("enabled", true)
                        .put("version", 1))
            )
        )
        val capability = CodexHistoryCapability.from(status)
        assertTrue(capability?.tailValidation?.enabled == true)
        assertEquals(1, capability?.tailValidation?.version)
    }

    @Test
    fun capabilityReadsTerminalReconcileIndependentlyFromTailValidation() {
        val status = JSONObject().put(
            "capabilities",
            JSONObject().put(
                "historySync",
                JSONObject()
                    .put("version", 1)
                    .put("terminalReconcile", JSONObject()
                        .put("enabled", true)
                        .put("version", 1))
            )
        )
        val capability = CodexHistoryCapability.from(status)
        assertTrue(capability?.terminalReconcile?.enabled == true)
        assertEquals(1, capability?.terminalReconcile?.version)
        assertNull(capability?.tailValidation)
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
    fun syncRequestCarriesServerSnapshotCapabilityAndProfileWithoutOlderRange() {
        val message = JSONObject(
            CodexClientMessages.historySyncRequest(
                CodexHistorySyncRequest(
                    syncId = "sync",
                    conversationId = "conversation",
                    checkpoint = CodexHistorySyncCheckpoint(null, 0, false),
                    cacheSchemaVersion = 3,
                    serverSnapshotSegments = CodexHistorySnapshotSegmentsCapability(true, 1, 3),
                    profileId = "profile-a"
                )
            )
        )
        assertEquals(3, message.getInt("cacheSchemaVersion"))
        assertTrue(message.getJSONObject("serverSnapshotSegments").getBoolean("enabled"))
        assertEquals("profile-a", message.getString("profileId"))
        assertFalse(message.has("rangeSegments"))
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
    fun tailValidationRequestIsExplicitAndDoesNotReuseHistorySyncType() {
        val message = JSONObject(
            CodexClientMessages.historyTailValidationRequest(
                CodexHistoryTailValidationRequest(
                    syncId = "validation-sync",
                    conversationId = "conversation",
                    checkpoint = CodexHistorySyncCheckpoint(
                        rootHash = "root",
                        itemCount = 10,
                        complete = true,
                        newestAnchorKey = "item-10",
                        newestAnchorHash = "hash-10"
                    ),
                    selectionGeneration = 7,
                    tailValidation = CodexHistoryTailValidationCapability(true, 1)
                )
            )
        )
        assertEquals("conversation_history_tail_validation_request", message.getString("type"))
        assertEquals(7L, message.getLong("selectionGeneration"))
        assertEquals("item-10", message.getJSONObject("checkpoint").getString("newestAnchorKey"))
        assertTrue(message.getJSONObject("tailValidation").getBoolean("enabled"))
        assertFalse(message.has("rangeSegments"))
        assertFalse(message.has("serverSnapshotSegments"))
    }

    @Test
    fun terminalReconcileRequestIsExplicitAndCarriesOnlyDurableContext() {
        val message = JSONObject(
            CodexClientMessages.historyTerminalReconcileRequest(
                CodexHistoryTerminalReconcileRequest(
                    syncId = "terminal-sync",
                    conversationId = "conversation",
                    checkpoint = CodexHistorySyncCheckpoint("root", 9, true),
                    selectionGeneration = 7,
                    terminalEpoch = "source-epoch#42",
                    terminalReconcile = CodexHistoryTerminalReconcileCapability(true, 1),
                    cacheSchemaVersion = 2
                )
            )
        )
        assertEquals("conversation_history_terminal_reconcile_request", message.getString("type"))
        assertEquals("source-epoch#42", message.getString("terminalEpoch"))
        assertEquals(2, message.getInt("cacheSchemaVersion"))
        assertTrue(message.getJSONObject("terminalReconcile").getBoolean("enabled"))
        assertFalse(message.has("rangeSegments"))
        assertFalse(message.has("serverSnapshotSegments"))
    }

    @Test
    fun syncStateDefaultsToHistorySyncPurposeAndParsesTailValidationPurpose() {
        val normal = CodexHistorySyncStateMessage.from(
            JSONObject()
                .put("syncId", "normal")
                .put("conversationId", "conversation")
                .put("state", "synced")
        )
        val validation = CodexHistorySyncStateMessage.from(
            JSONObject()
                .put("syncId", "validation")
                .put("conversationId", "conversation")
                .put("state", "unsupported")
                .put("purpose", "tail_validation")
        )
        assertEquals("history_sync", normal.purpose)
        assertEquals("tail_validation", validation.purpose)
    }

    @Test
    fun terminalReconcilePurposeAndEpochRemainOutsidePageHashInputs() {
        val state = CodexHistorySyncStateMessage.from(
            JSONObject()
                .put("syncId", "terminal")
                .put("conversationId", "conversation")
                .put("state", "synced")
                .put("purpose", "terminal_reconcile")
                .put("terminalEpoch", "epoch#4")
        )
        val delta = CodexHistoryDeltaWire.from(
            JSONObject()
                .put("syncId", "terminal")
                .put("conversationId", "conversation")
                .put("sequence", 1)
                .put("pageIndex", 0)
                .put("pageCount", 1)
                .put("pageHash", "hash")
                .put("targetRoot", "root")
                .put("baselineComplete", true)
                .put("fullOrderIncluded", false)
                .put("upserts", JSONArray())
                .put("deletes", JSONArray())
                .put("selectionGeneration", 1)
                .put("clientSelectionGeneration", 31)
                .put("purpose", "terminal_reconcile")
                .put("terminalEpoch", "epoch#4")
        )!!
        assertEquals("terminal_reconcile", state.purpose)
        assertEquals("epoch#4", state.terminalEpoch)
        assertEquals("terminal_reconcile", delta.purpose)
        assertEquals("epoch#4", delta.terminalEpoch)
        assertEquals(31L, delta.page.selectionGeneration)
    }

    @Test
    fun olderRequestCarriesDurableCheckpointAndNegotiatedRangeCapability() {
        val message = JSONObject(
            CodexClientMessages.historyOlderRequest(
                syncId = "sync",
                conversationId = "conversation",
                checkpoint = CodexHistorySyncCheckpoint(
                    rootHash = "tail-root",
                    itemCount = 200,
                    complete = false,
                    providerMode = "paginated",
                    providerIdentityHash = "codex-app-server",
                    rangeId = "tail-range",
                    rangeKind = "tail",
                    oldestAnchorKey = "tail-old",
                    oldestAnchorHash = "tail-old-hash",
                    newestAnchorKey = "tail-new",
                    newestAnchorHash = "tail-new-hash",
                    nextOlderCursor = "older-cursor",
                    coverageRoot = "tail-root",
                    hasMoreBefore = true,
                    coverageComplete = false
                ),
                selectionGeneration = 4,
                rangeSegments = CodexHistoryRangeCapability(true, 1, 3)
            )
        )
        assertEquals("conversation_history_older_request", message.getString("type"))
        assertEquals(4L, message.getLong("selectionGeneration"))
        assertEquals("older-cursor", message.getJSONObject("checkpoint").getString("nextOlderCursor"))
        assertEquals("paginated", message.getJSONObject("checkpoint").getString("providerMode"))
        assertEquals(3, message.getInt("cacheSchemaVersion"))
        assertTrue(message.getJSONObject("rangeSegments").getBoolean("enabled"))
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
    fun deltaParsesRangeProviderIdentity() {
        val json = JSONObject()
            .put("syncId", "sync")
            .put("conversationId", "conversation")
            .put("sequence", 1)
            .put("pageIndex", 0)
            .put("pageCount", 1)
            .put("pageHash", "hash")
            .put("targetRoot", "root")
            .put("range", JSONObject()
                .put("version", 1)
                .put("segmentId", "range")
                .put("rangeKind", "older")
                .put("providerMode", "paginated")
                .put("providerIdentityHash", "codex-app-server"))
        val range = CodexHistoryDeltaWire.from(json)!!.page.range
        assertEquals("older", range?.rangeKind)
        assertEquals("paginated", range?.providerMode)
        assertEquals("codex-app-server", range?.providerIdentityHash)
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

    @Test
    fun snapshotSegmentCommitCarriesDescriptorIdentityForAckValidation() {
        val commit = CodexHistorySegmentCommit.from(
            JSONObject()
                .put("syncId", "sync")
                .put("conversationId", "conversation")
                .put("sequence", 4)
                .put("pageIndex", 0)
                .put("segmentId", "segment")
                .put("pageHash", "a".repeat(64))
                .put("targetRoot", "root")
                .put("clientSelectionGeneration", 7)
        )!!
        assertEquals("segment", commit.segmentId)
        assertEquals(4, commit.sequence)
        assertEquals(7, commit.selectionGeneration)
        val ack = JSONObject(
            CodexClientMessages.historySegmentAck(
                syncId = commit.syncId,
                conversationId = commit.conversationId,
                targetRoot = commit.targetRoot,
                sequence = commit.sequence,
                pageIndex = commit.pageIndex,
                segmentId = commit.segmentId,
                pageHash = commit.pageHash,
                selectionGeneration = commit.selectionGeneration
            )
        )
        assertEquals("conversation_history_segment_ack", ack.getString("type"))
        assertEquals("segment", ack.getString("segmentId"))
    }
}
