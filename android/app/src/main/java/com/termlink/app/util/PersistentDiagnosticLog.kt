package com.termlink.app.util

import android.content.Context
import android.os.SystemClock
import android.util.Log
import com.termlink.app.BuildConfig
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong

/**
 * Small, privacy-oriented JSONL logger that survives an in-place APK update.
 * It is intentionally independent from Logcat: Logcat remains the developer
 * console while this file is the durable diagnostic source.
 */
object PersistentDiagnosticLog {
    private const val TAG = "TermLinkDiag"
    private const val DIRECTORY = "diagnostics"
    private const val FILE_NAME = "termlink-diagnostics.jsonl"
    private const val MAX_FILE_BYTES = 2L * 1024L * 1024L
    private const val MAX_ROTATED_FILES = 4
    private const val MAX_TEXT_LENGTH = 1200
    private const val MAX_STACK_LENGTH = 8000
    private const val WRITER_THREAD_NAME = "termlink-diagnostic-writer"
    private val sensitiveKey = Regex(
        "prompt|command|output|password|passwd|secret|authorization|ticket|access.?token|private.?key|certificate|attachment|raw|payload|body|content",
        RegexOption.IGNORE_CASE
    )
    private val sensitiveText = Regex(
        "(authorization|password|passwd|secret|ticket|access[_-]?token|private[_-]?key|certificate)\\s*[:=]\\s*[^\\s,;]+",
        RegexOption.IGNORE_CASE
    )
    private val safeAggregateKey = Regex(
        "^(attachmentCount|attachmentTypes|fileMentionCount|textLength|itemCount|messageCount|turnCount|durationMs|waitMs|revision|baseRevision|sourceEpoch)$"
    )
    private val lock = Any()
    private val sequence = AtomicLong(0L)
    private val writer = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, WRITER_THREAD_NAME).apply { isDaemon = true }
    }
    private var initialized = false
    private var enabled = false
    private var currentFile: File? = null
    private var runId = ""
    private var startedAtElapsed = 0L
    private var uncaughtHandlerInstalled = false

    fun initialize(context: Context, enabledOverride: Boolean? = null) {
        synchronized(lock) {
            if (initialized) return
            enabled = enabledOverride ?: BuildConfig.PERSISTENT_DIAGNOSTICS_ENABLED
            if (!enabled) {
                initialized = true
                return
            }
            val directory = File(context.applicationContext.filesDir, DIRECTORY)
            currentFile = File(directory, FILE_NAME)
            runId = UUID.randomUUID().toString()
            startedAtElapsed = SystemClock.elapsedRealtime()
            try {
                directory.mkdirs()
                currentFile?.let { file ->
                    if (!file.exists()) file.createNewFile()
                    rotateIfNeededLocked(file)
                }
                initialized = true
                event("app", "android.process.started", mapOf(
                    "appVersion" to BuildConfig.VERSION_NAME,
                    "appVersionCode" to BuildConfig.VERSION_CODE,
                    "debug" to BuildConfig.DEBUG,
                    "runId" to runId
                ), critical = true)
                installUncaughtExceptionHandlerLocked()
            } catch (error: Exception) {
                initialized = false
                Log.w(TAG, "Persistent diagnostics initialization failed", error)
            }
        }
    }

    fun isEnabled(): Boolean = enabled && initialized && currentFile != null

    /** Stable, non-reversible correlation key for cross-process diagnostics. */
    fun shortHash(value: String?): String? {
        val normalized = value?.trim().orEmpty()
        if (normalized.isEmpty()) return null
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(normalized.toByteArray(StandardCharsets.UTF_8))
        return digest.take(8).joinToString("") { byte ->
            (byte.toInt() and 0xff).toString(16).padStart(2, '0')
        }
    }

    fun event(
        component: String,
        name: String,
        fields: Map<String, Any?> = emptyMap(),
        level: String = "info",
        critical: Boolean = false
    ) {
        if (!isEnabled()) return
        val entry = buildEntry(component, name, fields, level)
        // UI/lifecycle events stay asynchronous even when marked critical; only
        // error-level records use a synchronous write so crash evidence can be
        // flushed before Android terminates the process.
        if (critical && level.equals("error", ignoreCase = true)) {
            writeSafely(entry)
        } else {
            writer.execute { writeSafely(entry) }
        }
    }

    fun error(
        component: String,
        name: String,
        error: Throwable,
        fields: Map<String, Any?> = emptyMap(),
        critical: Boolean = true
    ) {
        event(
            component = component,
            name = name,
            fields = fields + mapOf(
                "errorType" to error::class.java.simpleName,
                "errorMessage" to error.message,
                "stack" to error.stackTraceToString().take(MAX_STACK_LENGTH)
            ),
            level = "error",
            critical = critical
        )
    }

    private fun buildEntry(
        component: String,
        name: String,
        fields: Map<String, Any?>,
        level: String
    ): String {
        val json = JSONObject()
            .put("ts", java.time.Instant.now().toString())
            .put("elapsedMs", (SystemClock.elapsedRealtime() - startedAtElapsed).coerceAtLeast(0L))
            .put("runId", runId)
            .put("seq", sequence.incrementAndGet())
            .put("level", sanitizeText(level, 32))
            .put("component", sanitizeText(component, 80))
            .put("event", sanitizeText(name, 120))
        val safe = JSONObject()
        fields.entries.take(60).forEach { (key, value) ->
            val sanitized = sanitizeValue(key, value)
            if (sanitized != null) safe.put(key, sanitized)
        }
        json.put("fields", safe)
        return "$json\n"
    }

    private fun sanitizeValue(key: String, value: Any?): Any? {
        if (sensitiveKey.containsMatchIn(key) && !safeAggregateKey.matches(key)) return "<redacted>"
        return when (value) {
            null -> null
            is Boolean, is Number -> value
            is String -> sanitizeText(value)
            is Collection<*> -> value.take(20).map { item -> sanitizeValue(key, item) }
            else -> sanitizeText(value.toString())
        }
    }

    private fun sanitizeText(value: String?, maxLength: Int = MAX_TEXT_LENGTH): String {
        var text = value.orEmpty().replace(sensitiveText, "$1=<redacted>")
        text = Regex("(https?://[^\\s?]+)\\?[^\\s]*", RegexOption.IGNORE_CASE)
            .replace(text, "$1?<redacted>")
        return if (text.length <= maxLength) text else text.take(maxLength) + "…<truncated>"
    }

    private fun writeSafely(line: String) {
        val file = currentFile ?: return
        try {
            synchronized(lock) {
                if (file.length() + line.toByteArray(StandardCharsets.UTF_8).size > MAX_FILE_BYTES) {
                    rotateIfNeededLocked(file, force = true)
                }
                FileOutputStream(file, true).use { output ->
                    output.write(line.toByteArray(StandardCharsets.UTF_8))
                    output.fd.sync()
                }
            }
        } catch (error: Exception) {
            Log.w(TAG, "Persistent diagnostics write failed", error)
        }
    }

    private fun rotateIfNeededLocked(file: File, force: Boolean = false) {
        if (!force && file.length() < MAX_FILE_BYTES) return
        for (index in MAX_ROTATED_FILES downTo 1) {
            val source = File(file.parentFile, "${file.name}.$index")
            val target = File(file.parentFile, "${file.name}.${index + 1}")
            runCatching {
                if (index == MAX_ROTATED_FILES) {
                    source.delete()
                } else if (source.exists()) {
                    source.renameTo(target)
                } else {
                    Unit
                }
            }
        }
        runCatching {
            if (file.exists()) file.renameTo(File(file.parentFile, "${file.name}.1"))
            file.createNewFile()
        }
    }

    private fun installUncaughtExceptionHandlerLocked() {
        if (uncaughtHandlerInstalled) return
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            if (thread.name != WRITER_THREAD_NAME) {
                runCatching { writer.submit { }.get(500, TimeUnit.MILLISECONDS) }
            }
            error(
                "app",
                "android.uncaught_exception",
                throwable,
                mapOf("thread" to thread.name),
                critical = true
            )
            previous?.uncaughtException(thread, throwable)
        }
        uncaughtHandlerInstalled = true
    }
}
