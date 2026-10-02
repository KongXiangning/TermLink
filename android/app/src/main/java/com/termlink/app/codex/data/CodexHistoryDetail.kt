package com.termlink.app.codex.data

import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.nio.CharBuffer
import java.nio.charset.CodingErrorAction
import java.security.MessageDigest

data class CodexHistoryDetailRef(
    val kind: String,
    val refId: String,
    val contentHash: String,
    val byteSize: Long,
    val mimeType: String?,
    val truncated: Boolean,
    val availability: String = "present"
) {
    companion object {
        fun parseList(json: String?): List<CodexHistoryDetailRef> = runCatching {
            val array = JSONArray(json ?: "[]")
            require(array.length() <= 64)
            (0 until array.length()).map { index ->
                val ref = array.getJSONObject(index)
                val kind = ref.getString("kind")
                val id = ref.getString("refId").lowercase()
                val hash = ref.getString("contentHash").lowercase()
                require(kind.isNotBlank() && DETAIL_HASH.matches(id) && DETAIL_HASH.matches(hash))
                val size = detailInteger(ref, "byteSize")
                val truncated = ref.get("truncated") as? Boolean ?: error("detail_ref_invalid")
                CodexHistoryDetailRef(kind, id, hash, size,
                    ref.opt("mimeType") as? String, truncated,
                    (ref.opt("availability") as? String) ?: "present")
            }
        }.getOrDefault(emptyList())
    }
}

data class CodexHistoryDetailUiState(
    val itemKey: String,
    val ref: CodexHistoryDetailRef,
    val loading: Boolean = true,
    val receivedBytes: Int = 0,
    val content: String? = null,
    val error: String? = null
)

private val DETAIL_HASH = Regex("[a-f0-9]{64}")
private fun detailInteger(json: JSONObject, key: String): Long {
    val value = json.get(key)
    require(value is Int || value is Long) { "detail_integer_invalid" }
    return (value as Number).toLong().also {
        require(it in 0..9_007_199_254_740_991L) { "detail_integer_invalid" }
    }
}

/** A single read-only download. Only verified final bytes are exposed to the UI. */
class CodexHistoryDetailAssembly(val ref: CodexHistoryDetailRef) {
    companion object {
        // A bounded foreground viewer, not a bulk export or persistent detail cache.
        const val MAX_DETAIL_BYTES = 8 * 1024 * 1024
        const val CHUNK_BYTES = 48 * 1024

        fun request(conversationId: String, requestId: String, generation: Long,
                    ref: CodexHistoryDetailRef, cursor: String?): JSONObject = JSONObject()
            .put("type", "conversation_history_detail_request")
            .put("conversationId", conversationId).put("requestId", requestId)
            .put("selectionGeneration", generation).put("refId", ref.refId)
            .put("maxBytes", CHUNK_BYTES).apply { cursor?.let { put("cursor", it) } }

        fun matchesResponse(json: JSONObject, conversationId: String, requestId: String,
                            generation: Long): Boolean =
            json.opt("conversationId") == conversationId && json.opt("requestId") == requestId &&
                runCatching { detailInteger(json, "clientSelectionGeneration") == generation }.getOrDefault(false)
    }

    private val bytes = ByteArrayOutputStream()
    private val cursors = mutableSetOf<String>()
    private var serverGeneration: Long? = null
    var nextCursor: String? = null
        private set
    var content: String? = null
        private set
    val receivedBytes: Int get() = if (content == null) bytes.size() else ref.byteSize.toInt()

    init {
        require(ref.byteSize in 1..MAX_DETAIL_BYTES.toLong()) { "detail_size_limit" }
        require(ref.availability in setOf("present", "partial")) { "detail_unavailable" }
    }

    fun accept(json: JSONObject) {
        require(content == null) { "detail_already_complete" }
        require(json.toString().toByteArray(Charsets.UTF_8).size <= 112 * 1024) { "detail_envelope_limit" }
        require(json.opt("state") == "ok") { (json.opt("detailCode") as? String) ?: "detail_failed" }
        require((json.opt("refId") as? String)?.lowercase() == ref.refId &&
            (json.opt("contentHash") as? String)?.lowercase() == ref.contentHash &&
            detailInteger(json, "byteSize") == ref.byteSize) { "detail_ref_changed" }
        val generation = detailInteger(json, "selectionGeneration")
        require(serverGeneration == null || serverGeneration == generation) { "detail_selection_changed" }
        serverGeneration = generation
        require(detailInteger(json, "byteOffset") == receivedBytes.toLong()) { "detail_offset_invalid" }
        val chunk = json.get("content") as? String ?: error("detail_content_invalid")
        // Reject split/unpaired surrogates instead of silently hashing UTF-8 replacement characters.
        val encoded = Charsets.UTF_8.newEncoder().onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT).encode(CharBuffer.wrap(chunk))
        val chunkBytes = ByteArray(encoded.remaining()).also { encoded.get(it) }
        require(chunkBytes.isNotEmpty() && chunkBytes.size <= CHUNK_BYTES &&
            receivedBytes.toLong() + chunkBytes.size <= ref.byteSize) { "detail_chunk_size_invalid" }
        require(json.has("nextCursor")) { "detail_cursor_missing" }
        val cursor = if (json.isNull("nextCursor")) null else json.get("nextCursor") as? String
            ?: error("detail_cursor_invalid")
        if (cursor != null) {
            require(cursor.isNotBlank() && cursor.length <= 8192 && cursors.add(cursor) &&
                receivedBytes.toLong() + chunkBytes.size < ref.byteSize) { "detail_cursor_invalid" }
        } else require(receivedBytes.toLong() + chunkBytes.size == ref.byteSize) { "detail_incomplete" }
        bytes.write(chunkBytes)
        nextCursor = cursor
        if (cursor == null) {
            val body = bytes.toByteArray()
            val hash = MessageDigest.getInstance("SHA-256").digest(body).joinToString("") { "%02x".format(it) }
            require(hash == ref.contentHash) { "detail_hash_invalid" }
            content = body.toString(Charsets.UTF_8)
            bytes.reset()
        }
    }
}
