package com.termlink.app.ui.settings

import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.widget.Toolbar
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.setPadding
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import com.termlink.app.BuildConfig
import com.termlink.app.codex.data.CodexConversationCacheStore
import com.termlink.app.codex.data.CodexConversationStorageUsage
import com.termlink.app.codex.data.CodexThreadIndexEntry
import com.termlink.app.codex.data.CodexStorageUsage
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Local-only Codex cache accounting and manual cleanup. No remote deletion. */
class CodexStorageManagementActivity : AppCompatActivity() {
    companion object {
        /**
         * Debug/instrumentation-only database injection. The activity is not
         * exported, and production callers continue to use the canonical
         * database. Keeping this seam explicit lets destructive UI tests use
         * an isolated cache without ever touching a user's real history.
         */
        const val EXTRA_DATABASE_NAME = "com.termlink.app.codex.storage.database_name"
        private const val DEFAULT_DATABASE_NAME = "codex_conversations.db"
    }

    private data class TaskUsage(
        val entry: CodexThreadIndexEntry,
        val storage: CodexConversationStorageUsage
    )

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private lateinit var content: LinearLayout
    private lateinit var store: CodexConversationCacheStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val injectedDatabase = if (BuildConfig.DEBUG) {
            intent.getStringExtra(EXTRA_DATABASE_NAME)
                ?.takeIf { it.matches(Regex("[A-Za-z0-9_.-]+")) }
        } else {
            null
        }
        store = CodexConversationCacheStore(
            applicationContext,
            injectedDatabase ?: DEFAULT_DATABASE_NAME
        )
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24)
        }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            view.updatePadding(top = insets.getInsets(WindowInsetsCompat.Type.statusBars()).top)
            insets
        }
        root.addView(Toolbar(this).apply {
            title = getString(com.termlink.app.R.string.codex_storage_screen_title)
            setNavigationIcon(android.R.drawable.ic_menu_close_clear_cancel)
            setNavigationOnClickListener { finish() }
        }, LinearLayout.LayoutParams(-1, dp(56)))
        root.addView(ScrollView(this).apply { addView(content) }, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)
        refresh()
    }

    override fun onDestroy() {
        scope.cancel()
        store.close()
        super.onDestroy()
    }

    private fun refresh() {
        scope.launch {
            val snapshot = withContext(Dispatchers.IO) {
                store.readStorageUsage().map { service ->
                    val tasks = store.readThreadIndex(service.endpointId).map { entry ->
                        TaskUsage(entry, store.readConversationStorageUsage(service.endpointId, entry.conversationId))
                    }
                    service to tasks
                }
            }
            content.removeAllViews()
            content.addView(TextView(this@CodexStorageManagementActivity).apply {
                text = getString(com.termlink.app.R.string.codex_storage_retention_hint)
                setPadding(0, 0, 0, 16)
            })
            if (snapshot.isEmpty()) {
                content.addView(TextView(this@CodexStorageManagementActivity).apply {
                    text = getString(com.termlink.app.R.string.codex_storage_no_cache)
                })
            }
            snapshot.forEach { (service, tasks) -> renderService(service, tasks) }
        }
    }

    private fun renderService(usage: CodexStorageUsage, tasks: List<TaskUsage>) {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16)
        }
        card.addView(TextView(this).apply {
            text = getString(
                com.termlink.app.R.string.codex_storage_service_name,
                usage.serviceName,
                if (!usage.profilePresent) getString(com.termlink.app.R.string.codex_storage_profile_removed) else ""
            )
            textSize = 17f
        })
        card.addView(TextView(this).apply {
            text = getString(
                com.termlink.app.R.string.codex_storage_usage,
                usage.taskCount,
                formatBytes(usage.bodyBytes),
                formatBytes(usage.thumbnailBytes),
                formatBytes(usage.originalBytes),
                formatBytes(usage.totalBytes)
            )
            setPadding(0, 8, 0, 8)
        })
        val taskList = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        tasks.forEach { task ->
            val entry = task.entry
            taskList.addView(LinearLayout(this@CodexStorageManagementActivity).apply {
                orientation = LinearLayout.HORIZONTAL
                val label = TextView(this@CodexStorageManagementActivity).apply {
                    text = getString(
                        com.termlink.app.R.string.codex_storage_task_name,
                        entry.title.ifBlank { entry.conversationId },
                        formatBytes(task.storage.bodyBytes),
                        formatBytes(task.storage.thumbnailBytes),
                        formatBytes(task.storage.originalBytes),
                        formatBytes(task.storage.totalBytes)
                    )
                    layoutParams = LinearLayout.LayoutParams(0, -2, 1f)
                }
                addView(label)
                addView(Button(this@CodexStorageManagementActivity).apply {
                    text = getString(com.termlink.app.R.string.codex_storage_clear)
                    setOnClickListener { confirmClearTask(usage.endpointId, entry.conversationId, entry.title) }
                })
            })
        }
        card.addView(taskList)
        card.addView(Button(this).apply {
            text = getString(com.termlink.app.R.string.codex_storage_clear_service)
            setOnClickListener { confirmClearService(usage.endpointId) }
        })
        content.addView(card)
    }

    private fun confirmClearTask(endpointId: String, conversationId: String, title: String) {
        val dialog = AlertDialog.Builder(this)
            .setTitle(getString(com.termlink.app.R.string.codex_storage_clear_task_title))
            .setMessage(getString(
                com.termlink.app.R.string.codex_storage_clear_task_message,
                title.ifBlank { conversationId }
            ))
            .setNegativeButton(getString(com.termlink.app.R.string.codex_storage_cancel), null)
            .setPositiveButton(getString(com.termlink.app.R.string.codex_storage_clear)) { _, _ ->
                scope.launch(Dispatchers.IO) {
                    deletePaths(store.clearConversationCache(endpointId, conversationId))
                    withContext(Dispatchers.Main) { refresh() }
                }
            }
            .create()
        dialog.show()
    }

    private fun confirmClearService(endpointId: String) {
        val dialog = AlertDialog.Builder(this)
            .setTitle(getString(com.termlink.app.R.string.codex_storage_clear_service_title))
            .setMessage(getString(com.termlink.app.R.string.codex_storage_clear_service_message))
            .setNegativeButton(getString(com.termlink.app.R.string.codex_storage_cancel), null)
            .setPositiveButton(getString(com.termlink.app.R.string.codex_storage_clear)) { _, _ ->
                scope.launch(Dispatchers.IO) {
                    deletePaths(store.clearServiceCache(endpointId))
                    withContext(Dispatchers.Main) { refresh() }
                }
            }
            .create()
        dialog.show()
    }

    private fun deletePaths(paths: List<String>) {
        val root = File(filesDir, "codex-media").canonicalFile
        paths.forEach { raw ->
            val file = runCatching { File(raw).canonicalFile }.getOrNull() ?: return@forEach
            val relative = file.relativeToOrNull(root) ?: return@forEach
            if (relative.path.isNotBlank()) file.delete()
        }
    }

    private fun formatBytes(bytes: Long): String = when {
        bytes >= 1024 * 1024 -> "%.1f MiB".format(bytes / (1024.0 * 1024.0))
        bytes >= 1024 -> "%.1f KiB".format(bytes / 1024.0)
        else -> "$bytes B"
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
