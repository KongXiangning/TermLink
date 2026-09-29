package com.termlink.app.codex.data

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test

class CodexHistoryPageHashTest {
    @Test
    fun productReplacementRootMatchesNodeCanonicalRoot() {
        val item = CodexHistoryItem(
            itemKey = "product-0", turnId = "turn-product-0", position = 0,
            itemType = "message", role = "assistant", clientRequestId = null,
            payloadJson = "{\"text\":\"product-0\"}",
            contentHash = "5e8978244cb8e3d3b41d4693fc284e2b9ba5bca8628cdee3eeb6107424e3f47c"
        )
        assertEquals(
            "9bc2d8061ec1ab85c82ce3cfc7302ec5a12f22ea5e8241936f5bc20b3c4850da",
            productRangeRoot(listOf(item))
        )
    }

    @Test
    fun productDetailRefsAndAvailabilityMatchNodePageHash() {
        val stream = javaClass.classLoader!!.getResourceAsStream("codex_product_db_detail_delta.json")!!
        val fixture = JSONObject(stream.bufferedReader().use { it.readText() })
        val wire = fixture.getJSONObject("page")
            .put("conversationId", "fixture")
            .put("pageHash", fixture.getString("expectedPageHash"))
        val page = CodexHistoryDeltaWire.from(wire)!!.page
        assertEquals(fixture.getString("expectedPageHash"), CodexHistoryPageHasher.pageHash(page))
        assertEquals(wire.getJSONArray("upserts").getJSONObject(0).getJSONArray("detailRefs").toString(), page.upserts.single().detailRefsJson)
    }

    @Test
    fun goldenVectorsMatchNodePageHash() {
        val stream = javaClass.classLoader!!.getResourceAsStream("codex_history_page_hash_v1.json")!!
        val root = JSONObject(stream.bufferedReader().use { it.readText() })
        val vectors = root.getJSONArray("vectors")
        for (index in 0 until vectors.length()) {
            val vector = vectors.getJSONObject(index)
            val page = vector.getJSONObject("page")
            val upserts = page.getJSONArray("upserts").let { values ->
                (0 until values.length()).map { itemIndex ->
                    val item = values.getJSONObject(itemIndex)
                    CodexHistoryItem(
                        itemKey = item.getString("itemKey"),
                        turnId = item.optStringOrNull("turnId"),
                        position = item.getInt("position"),
                        itemType = item.getString("itemType"),
                        role = item.optStringOrNull("role"),
                        clientRequestId = item.optStringOrNull("clientRequestId"),
                        payloadJson = item.getString("payloadJson"),
                        contentHash = item.getString("contentHash")
                    )
                }
            }
            val pageModel = CodexHistoryDeltaPage(
                syncId = page.getString("syncId"),
                conversationId = "fixture",
                sequence = page.getInt("sequence"),
                pageIndex = page.getInt("pageIndex"),
                pageCount = page.getInt("pageCount"),
                pageHash = "",
                baseRoot = page.optStringOrNull("baseRoot"),
                targetRoot = page.getString("targetRoot"),
                baselineComplete = page.getBoolean("baselineComplete"),
                fullOrderIncluded = page.getBoolean("fullOrderIncluded"),
                canonicalOrder = page.getJSONArray("canonicalOrder").toStringList(),
                upserts = upserts,
                deletes = page.getJSONArray("deletes").toStringList()
            )
            assertEquals(vector.getString("name"), vector.getString("expectedPageHash"), CodexHistoryPageHasher.pageHash(pageModel))
        }
    }

    @Test
    fun rangePageHashMatchesNodeRangeVector() {
        val page = CodexHistoryDeltaPage(
            syncId = "123e4567-e89b-12d3-a456-426614174000",
            conversationId = "fixture",
            sequence = 1,
            pageIndex = 0,
            pageCount = 1,
            pageHash = "",
            baseRoot = "base",
            targetRoot = "target",
            baselineComplete = false,
            fullOrderIncluded = false,
            upserts = listOf(
                CodexHistoryItem(
                    itemKey = "older-1",
                    turnId = "turn",
                    position = 0,
                    itemType = "message",
                    role = "assistant",
                    clientRequestId = null,
                    payloadJson = "{\"text\":\"older\"}",
                    contentHash = "hash"
                )
            ),
            range = CodexHistoryRangeMetadata(
                version = 1,
                segmentId = "segment-1",
                rangeId = "segment-1",
                rangeKind = "older",
                providerMode = "paginated",
                providerIdentityHash = "codex-app-server",
                newestAnchor = CodexHistoryRangeAnchor("older-1", "hash"),
                oldestAnchor = CodexHistoryRangeAnchor("older-1", "hash"),
                nextOlderCursor = "cursor-2",
                hasMoreBefore = true,
                coverageRoot = "target",
                coverageComplete = false
            )
        )
        assertEquals(
            "4d0f895a3d5c103c7f15b1f078c0234d9d2830652c225a04d52fa8886750e42b",
            CodexHistoryPageHasher.pageHash(page)
        )
    }
}

private fun JSONObject.optStringOrNull(key: String): String? =
    if (isNull(key)) null else optString(key).takeIf { it.isNotEmpty() }

private fun org.json.JSONArray.toStringList(): List<String> =
    (0 until length()).map { getString(it) }
