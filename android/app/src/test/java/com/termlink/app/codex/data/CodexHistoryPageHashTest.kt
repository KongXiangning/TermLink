package com.termlink.app.codex.data

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test

class CodexHistoryPageHashTest {
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
}

private fun JSONObject.optStringOrNull(key: String): String? =
    if (isNull(key)) null else optString(key).takeIf { it.isNotEmpty() }

private fun org.json.JSONArray.toStringList(): List<String> =
    (0 until length()).map { getString(it) }
