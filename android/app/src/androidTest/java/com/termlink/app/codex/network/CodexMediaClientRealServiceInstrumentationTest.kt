package com.termlink.app.codex.network

import android.database.sqlite.SQLiteDatabase
import android.util.Log
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.termlink.app.codex.data.CodexConversationCacheStore
import com.termlink.app.data.ServerConfigStore
import com.termlink.app.data.SessionApiClient
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.CopyOnWriteArrayList
import org.junit.Test
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.runner.RunWith

/**
 * Real-device smoke for the configured home/local media routes.
 *
 * The test reads only endpoint/hash metadata from the app cache and downloads
 * into an isolated cache subdirectory. Opening the cache store first allows
 * its idempotent additive schema repair to run for pre-release databases; it
 * never clears or rewrites the production conversation/media cache.
 */
@RunWith(AndroidJUnit4::class)
class CodexMediaClientRealServiceInstrumentationTest {

    private val tag = "RealMediaProof"

    @Test
    fun configuredServicesDownloadOriginalWithProgressAndAtomicCommit() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val profiles = ServerConfigStore(context).loadState().profiles
        CodexConversationCacheStore(context).use { it.writableDatabase }
        val endpointHashes = readFirstOriginalHashByEndpoint(context)
        assumeTrue(
            "no configured endpoint has a cached media reference; real-service smoke is skipped",
            profiles.any { endpointHashes.containsKey(it.id) }
        )

        profiles.filter { endpointHashes.containsKey(it.id) }.forEach { profile ->
            val hash = endpointHashes[profile.id] ?: error("missing media hash for ${profile.id}")
            Log.i(tag, "starting profile=${profile.name} endpoint=${profile.id}")
            val root = File(context.cacheDir, "real-media-proof/${profile.id}").apply {
                deleteRecursively()
                mkdirs()
            }
            try {
                val progress = CopyOnWriteArrayList<CodexMediaDownloadProgress>()
                val client = CodexMediaClient.forProfile(
                    context = context,
                    profile = profile,
                    sessionApiClient = SessionApiClient(context),
                    cacheDir = root
                )
                val file = client.download(
                    contentHash = hash,
                    extension = ".png",
                    expectedHash = hash,
                    onProgress = progress::add
                )

                assertTrue("${profile.name}: original file missing", file.isFile)
                assertEquals("${profile.name}: original hash mismatch", hash, sha256(file))
                assertTrue("${profile.name}: no progress callbacks", progress.isNotEmpty())
                assertEquals("${profile.name}: progress did not start at zero", 0L, progress.first().downloadedBytes)
                assertTrue("${profile.name}: progress did not advance", progress.last().downloadedBytes > 0L)
                assertTrue("${profile.name}: progress regressed", progress.zipWithNext().all { (a, b) -> b.downloadedBytes >= a.downloadedBytes })
                assertFalse("${profile.name}: partial file remained", File(file.parentFile, "${file.name}.part").exists())
                Log.i(tag, "passed profile=${profile.name} bytes=${file.length()} callbacks=${progress.size} final=${progress.last().downloadedBytes}")
            } finally {
                root.deleteRecursively()
            }
        }
    }

    private fun readFirstOriginalHashByEndpoint(context: android.content.Context): Map<String, String> {
        val dbFile = context.getDatabasePath("codex_conversations.db")
        if (!dbFile.isFile) return emptyMap()
        val db = SQLiteDatabase.openDatabase(dbFile.path, null, SQLiteDatabase.OPEN_READONLY)
        return try {
            val result = linkedMapOf<String, String>()
            db.rawQuery(
                "SELECT endpoint_id, original_hash FROM conversation_media_refs WHERE original_hash IS NOT NULL ORDER BY endpoint_id, conversation_id, item_key",
                null
            ).use { cursor ->
                while (cursor.moveToNext()) {
                    result.putIfAbsent(cursor.getString(0), cursor.getString(1))
                }
            }
            result
        } finally {
            db.close()
        }
    }

    private fun sha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
            while (true) {
                val count = input.read(buffer)
                if (count <= 0) break
                digest.update(buffer, 0, count)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }
}
