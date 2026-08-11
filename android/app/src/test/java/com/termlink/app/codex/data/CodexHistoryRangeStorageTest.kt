package com.termlink.app.codex.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CodexHistoryRangeStorageTest {
    @Test
    fun anAlreadyCachedTailCanCommitRangeMetadataWithoutAPlaceholderItem() {
        val page = CodexHistoryDeltaPage(
            syncId = "sync",
            conversationId = "conversation",
            sequence = 1,
            pageIndex = 0,
            pageCount = 1,
            pageHash = "hash",
            baseRoot = "local-root",
            targetRoot = "local-root",
            baselineComplete = false,
            fullOrderIncluded = false,
            range = CodexHistoryRangeMetadata(
                version = 1,
                segmentId = "tail",
                rangeId = "tail",
                rangeKind = "tail",
                newestAnchor = CodexHistoryRangeAnchor("new", "new-hash"),
                oldestAnchor = CodexHistoryRangeAnchor("old", "old-hash"),
                nextOlderCursor = "older",
                hasMoreBefore = true,
                coverageRoot = "tail-root",
                coverageComplete = false
            )
        )

        assertTrue(isMetadataOnlyRangePage(page))
    }

    @Test
    fun anEmptyOlderPageIsNotAcceptedAsTailMetadataOnlyCommit() {
        val page = CodexHistoryDeltaPage(
            syncId = "sync",
            conversationId = "conversation",
            sequence = 1,
            pageIndex = 0,
            pageCount = 1,
            pageHash = "hash",
            baseRoot = "local-root",
            targetRoot = "local-root",
            baselineComplete = false,
            fullOrderIncluded = false,
            range = CodexHistoryRangeMetadata(
                version = 1,
                segmentId = "older",
                rangeId = "older",
                rangeKind = "older",
                newestAnchor = CodexHistoryRangeAnchor("new", "new-hash"),
                oldestAnchor = CodexHistoryRangeAnchor("old", "old-hash"),
                nextOlderCursor = null,
                hasMoreBefore = false,
                coverageRoot = "older-root",
                coverageComplete = false
            )
        )

        assertFalse(isMetadataOnlyRangePage(page))
    }

    @Test
    fun onlyServerSnapshotTailMayResetPreviousStaticRangeOwnership() {
        val snapshotTail = CodexHistoryDeltaPage(
            syncId = "sync",
            conversationId = "conversation",
            sequence = 1,
            pageIndex = 0,
            pageCount = 1,
            pageHash = "hash",
            baseRoot = "old-root",
            targetRoot = "tail-root",
            baselineComplete = false,
            fullOrderIncluded = false,
            range = CodexHistoryRangeMetadata(
                version = 1,
                segmentId = "snapshot-tail",
                rangeId = "snapshot-tail",
                rangeKind = "tail",
                providerMode = "server_snapshot",
                newestAnchor = null,
                oldestAnchor = null,
                nextOlderCursor = null,
                hasMoreBefore = true,
                coverageRoot = "tail-root",
                coverageComplete = false
            )
        )
        assertTrue(isServerSnapshotBootstrap(snapshotTail))
        assertFalse(isServerSnapshotBootstrap(snapshotTail.copy(range = snapshotTail.range?.copy(rangeKind = "older"))))
        assertFalse(isServerSnapshotBootstrap(snapshotTail.copy(range = snapshotTail.range?.copy(providerMode = "paginated"))))
    }

    @Test
    fun migratedLegacyCheckpointKeepsV2CompleteButDoesNotClaimRangeCoverage() {
        val checkpoint = CodexConversationCheckpoint(
            endpointId = "home",
            conversationId = "legacy-thread",
            schemaVersion = CodexHistoryCacheSchema.CHECKPOINT_SCHEMA_VERSION,
            rootHash = "old-root",
            itemCount = 4,
            complete = true,
            coverageState = CodexHistoryCoverageState.LEGACY_UNKNOWN
        )

        assertTrue(checkpoint.complete)
        assertFalse(checkpoint.coverageComplete)
        assertEquals(CodexHistoryCoverageState.LEGACY_UNKNOWN, checkpoint.coverageState)
        assertNull(checkpoint.hasMoreBefore)
        assertNull(checkpoint.nextOlderCursor)
    }

    @Test
    fun onlyExplicitRangeProofMayMarkCoverageComplete() {
        val checkpoint = CodexConversationCheckpoint(
            endpointId = "home",
            conversationId = "range-thread",
            rangeId = "range-1",
            rangeKind = "full",
            oldestAnchorKey = "first",
            newestAnchorKey = "last",
            coverageRoot = "range-root",
            hasMoreBefore = false,
            coverageComplete = true,
            coverageState = CodexHistoryCoverageState.COMPLETE
        )

        assertTrue(checkpoint.coverageComplete)
        assertEquals(CodexHistoryCoverageState.COMPLETE, checkpoint.coverageState)
        assertEquals(false, checkpoint.hasMoreBefore)
        assertEquals("range-root", checkpoint.coverageRoot)
    }

    @Test
    fun prependingTwoOlderPagesUsesDecreasingCompatiblePositions() {
        val tail = CodexHistoryCacheSchema.CompatiblePosition.append(null, 3)
        val firstOlder = CodexHistoryCacheSchema.CompatiblePosition.prepend(tail.first(), 2)
        val secondOlder = CodexHistoryCacheSchema.CompatiblePosition.prepend(firstOlder.first(), 2)

        assertEquals(listOf(0, 1, 2), tail)
        assertEquals(listOf(-2, -1), firstOlder)
        assertEquals(listOf(-4, -3), secondOlder)
        assertTrue(secondOlder.last() < firstOlder.first())
        assertTrue(firstOlder.last() < tail.first())
    }

    @Test
    fun appendingAfterOlderPagesDoesNotRewriteExistingPositions() {
        val existing = listOf(-4, -3, -2, -1, 0, 1, 2)
        val appended = CodexHistoryCacheSchema.CompatiblePosition.append(existing.last(), 2)

        assertEquals(listOf(3, 4), appended)
        assertEquals(listOf(-4, -3, -2, -1, 0, 1, 2), existing)
    }

    @Test
    fun olderSegmentsUseDecreasingRanksWithoutRenumberingExistingSegments() {
        val tailRank = 0L
        val firstOlderRank = CodexHistoryCacheSchema.SegmentRank.prepend(tailRank)
        val secondOlderRank = CodexHistoryCacheSchema.SegmentRank.prepend(firstOlderRank)

        assertEquals(-1L, firstOlderRank)
        assertEquals(-2L, secondOlderRank)
        assertEquals(0L, tailRank)
        assertEquals(1L, CodexHistoryCacheSchema.SegmentRank.append(tailRank))
    }

    @Test
    fun positionAllocatorFailsClosedAtIntegerBounds() {
        assertEquals(
            listOf(Int.MIN_VALUE),
            CodexHistoryCacheSchema.CompatiblePosition.prepend(Int.MIN_VALUE + 1, 1)
        )
        assertEquals(
            listOf(Int.MAX_VALUE),
            CodexHistoryCacheSchema.CompatiblePosition.append(Int.MAX_VALUE - 1, 1)
        )
        runCatching {
            CodexHistoryCacheSchema.CompatiblePosition.prepend(Int.MIN_VALUE, 1)
        }.onSuccess { error("expected prepend underflow") }
        runCatching {
            CodexHistoryCacheSchema.CompatiblePosition.append(Int.MAX_VALUE, 1)
        }.onSuccess { error("expected append overflow") }
    }
}
