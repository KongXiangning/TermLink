package com.termlink.app.ui.sessions

import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.termlink.app.R
import com.termlink.app.data.ApiResult
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionApiClient
import com.termlink.app.data.SessionApiError
import com.termlink.app.data.SessionSummary
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class SessionsFragment : Fragment(R.layout.fragment_sessions) {

    interface Callbacks {
        fun getActiveProfile(): ServerProfile?
        fun getCurrentSessionId(): String
        fun onOpenSession(sessionId: String)
        fun onUpdateSessionSelection(sessionId: String)
    }

    private var callbacks: Callbacks? = null

    private lateinit var sessionApiClient: SessionApiClient
    private val executor: ExecutorService = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private val autoRefreshRunnable = object : Runnable {
        override fun run() {
            if (isAutoRefreshActive && !isLoading) {
                refreshSessions(showSpinner = false)
            }
            if (isAutoRefreshActive) {
                mainHandler.postDelayed(this, AUTO_REFRESH_INTERVAL_MS)
            }
        }
    }

    private var isViewActive = false
    private var isAutoRefreshActive = false
    private var isLoading = false
    private var sessions: List<SessionSummary> = emptyList()
    private var lastError: SessionApiError? = null
    private var currentSessionId: String = ""
    private var activeProfile: ServerProfile? = null

    private lateinit var profileText: TextView
    private lateinit var errorText: TextView
    private lateinit var emptyText: TextView
    private lateinit var listContainer: LinearLayout
    private lateinit var swipeRefresh: SwipeRefreshLayout

    override fun onAttach(context: Context) {
        super.onAttach(context)
        callbacks = context as? Callbacks
            ?: throw IllegalStateException("Host activity must implement SessionsFragment.Callbacks")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        sessionApiClient = SessionApiClient(requireContext().applicationContext)
    }

    override fun onDetach() {
        callbacks = null
        super.onDetach()
    }

    override fun onDestroy() {
        stopAutoRefresh()
        executor.shutdownNow()
        super.onDestroy()
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        isViewActive = true

        profileText = view.findViewById(R.id.sessions_active_profile)
        errorText = view.findViewById(R.id.sessions_error_text)
        emptyText = view.findViewById(R.id.sessions_empty_text)
        listContainer = view.findViewById(R.id.sessions_list_container)
        swipeRefresh = view.findViewById(R.id.sessions_swipe_refresh)

        swipeRefresh.setOnRefreshListener {
            refreshSessions(showSpinner = true)
        }
        view.findViewById<Button>(R.id.btn_create_session).setOnClickListener {
            showCreateDialog()
        }
    }

    override fun onResume() {
        super.onResume()
        if (!isHidden) {
            startAutoRefresh()
            refreshSessions(showSpinner = false)
        }
    }

    override fun onPause() {
        stopAutoRefresh()
        super.onPause()
    }

    override fun onHiddenChanged(hidden: Boolean) {
        super.onHiddenChanged(hidden)
        if (hidden) {
            stopAutoRefresh()
            return
        }
        if (isResumed) {
            startAutoRefresh()
            refreshSessions(showSpinner = false)
        }
    }

    override fun onDestroyView() {
        stopAutoRefresh()
        isViewActive = false
        super.onDestroyView()
    }

    private fun refreshSessions(showSpinner: Boolean) {
        if (!isViewActive || isLoading) {
            return
        }

        val cb = callbacks ?: return
        val profile = cb.getActiveProfile()
        val selectedSessionId = cb.getCurrentSessionId()
        activeProfile = profile
        currentSessionId = selectedSessionId
        renderProfile(profile)

        if (profile == null) {
            renderFailure(
                SessionApiError(
                    code = com.termlink.app.data.SessionApiErrorCode.EMPTY_BASE_URL,
                    message = getString(R.string.sessions_error_no_active_profile)
                )
            )
            return
        }

        if (profile.baseUrl.isBlank()) {
            renderFailure(
                SessionApiError(
                    code = com.termlink.app.data.SessionApiErrorCode.EMPTY_BASE_URL,
                    message = getString(R.string.sessions_error_empty_base_url)
                )
            )
            return
        }

        isLoading = true
        if (showSpinner) {
            swipeRefresh.isRefreshing = true
        }

        executor.execute {
            val result = sessionApiClient.listSessions(profile)
            mainHandler.post {
                if (!isViewActive) return@post
                swipeRefresh.isRefreshing = false
                isLoading = false
                when (result) {
                    is ApiResult.Success -> renderSessions(result.value)
                    is ApiResult.Failure -> renderFailure(result.error)
                }
            }
        }
    }

    private fun renderProfile(profile: ServerProfile?) {
        profileText.text = if (profile == null) {
            getString(R.string.sessions_profile_none)
        } else {
            val urlLabel = profile.baseUrl.ifBlank { getString(R.string.sessions_profile_url_empty) }
            getString(R.string.sessions_profile_active, profile.name, urlLabel)
        }
    }

    private fun renderSessions(newSessions: List<SessionSummary>) {
        sessions = newSessions
        lastError = null

        errorText.visibility = View.GONE
        listContainer.removeAllViews()

        if (sessions.isEmpty()) {
            emptyText.visibility = View.VISIBLE
            callbacks?.onUpdateSessionSelection("")
            return
        }

        emptyText.visibility = View.GONE

        if (currentSessionId.isNotBlank() && sessions.none { it.id == currentSessionId }) {
            currentSessionId = sessions.first().id
            callbacks?.onUpdateSessionSelection(currentSessionId)
        }

        sessions.forEach { session ->
            val itemView = layoutInflater.inflate(R.layout.item_session, listContainer, false)
            val isSelected = session.id == currentSessionId

            val nameText = itemView.findViewById<TextView>(R.id.session_name)
            val metaText = itemView.findViewById<TextView>(R.id.session_meta)
            val openButton = itemView.findViewById<Button>(R.id.btn_open_session)
            val renameButton = itemView.findViewById<Button>(R.id.btn_rename_session)
            val deleteButton = itemView.findViewById<Button>(R.id.btn_delete_session)

            nameText.text = if (isSelected) {
                getString(R.string.sessions_item_name_selected, session.name)
            } else {
                session.name
            }
            metaText.text = getString(
                R.string.sessions_item_meta,
                session.status,
                session.activeConnections,
                formatRelativeTime(session.lastActiveAt)
            )

            itemView.setOnClickListener {
                openSession(session.id)
            }
            openButton.setOnClickListener {
                openSession(session.id)
            }
            renameButton.setOnClickListener {
                showRenameDialog(session)
            }
            deleteButton.setOnClickListener {
                showDeleteDialog(session)
            }

            listContainer.addView(itemView)
        }
    }

    private fun renderFailure(error: SessionApiError) {
        sessions = emptyList()
        lastError = error
        listContainer.removeAllViews()
        emptyText.visibility = View.GONE
        errorText.visibility = View.VISIBLE
        errorText.text = getString(R.string.sessions_error_template, error.code.name, error.message)
        swipeRefresh.isRefreshing = false
        isLoading = false
    }

    private fun showCreateDialog() {
        showSessionNameDialog(
            title = getString(R.string.sessions_create_title),
            initialValue = ""
        ) { newName ->
            val profile = activeProfile
            if (profile == null || profile.baseUrl.isBlank()) {
                renderFailure(
                    SessionApiError(
                        code = com.termlink.app.data.SessionApiErrorCode.EMPTY_BASE_URL,
                        message = getString(R.string.sessions_error_empty_base_url)
                    )
                )
                return@showSessionNameDialog
            }
            runAction(
                action = { sessionApiClient.createSession(profile, newName) },
                onSuccess = { created ->
                    callbacks?.onOpenSession(created.id)
                    refreshSessions(showSpinner = false)
                }
            )
        }
    }

    private fun showRenameDialog(session: SessionSummary) {
        showSessionNameDialog(
            title = getString(R.string.sessions_rename_title),
            initialValue = session.name
        ) { newName ->
            val profile = activeProfile
            if (profile == null || profile.baseUrl.isBlank()) {
                renderFailure(
                    SessionApiError(
                        code = com.termlink.app.data.SessionApiErrorCode.EMPTY_BASE_URL,
                        message = getString(R.string.sessions_error_empty_base_url)
                    )
                )
                return@showSessionNameDialog
            }
            runAction(
                action = { sessionApiClient.renameSession(profile, session.id, newName) },
                onSuccess = {
                    refreshSessions(showSpinner = false)
                }
            )
        }
    }

    private fun showDeleteDialog(session: SessionSummary) {
        AlertDialog.Builder(requireContext())
            .setTitle(getString(R.string.sessions_delete_title))
            .setMessage(getString(R.string.sessions_delete_confirm, session.name))
            .setNegativeButton(android.R.string.cancel, null)
            .setPositiveButton(R.string.sessions_delete_title) { _, _ ->
                val profile = activeProfile
                if (profile == null || profile.baseUrl.isBlank()) {
                    renderFailure(
                        SessionApiError(
                            code = com.termlink.app.data.SessionApiErrorCode.EMPTY_BASE_URL,
                            message = getString(R.string.sessions_error_empty_base_url)
                        )
                    )
                    return@setPositiveButton
                }
                runAction(
                    action = { sessionApiClient.deleteSession(profile, session.id) },
                    onSuccess = {
                        if (session.id == currentSessionId) {
                            val fallback = sessions.firstOrNull { it.id != session.id }?.id.orEmpty()
                            callbacks?.onUpdateSessionSelection(fallback)
                            currentSessionId = fallback
                        }
                        refreshSessions(showSpinner = false)
                    }
                )
            }
            .show()
    }

    private fun openSession(sessionId: String) {
        currentSessionId = sessionId
        callbacks?.onOpenSession(sessionId)
        renderSessions(sessions)
    }

    private fun showSessionNameDialog(
        title: String,
        initialValue: String,
        onConfirm: (String) -> Unit
    ) {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_session_name, null, false)
        val input = dialogView.findViewById<EditText>(R.id.input_session_name)
        input.setText(initialValue)
        input.setSelection(input.text.length)

        val dialog = AlertDialog.Builder(requireContext())
            .setTitle(title)
            .setView(dialogView)
            .setNegativeButton(android.R.string.cancel, null)
            .setPositiveButton(android.R.string.ok, null)
            .create()

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val value = input.text.toString().trim()
                if (value.isBlank() || value.length > 64) {
                    input.error = getString(R.string.sessions_name_invalid)
                    return@setOnClickListener
                }
                onConfirm(value)
                dialog.dismiss()
            }
        }

        dialog.show()
    }

    private fun <T> runAction(
        action: () -> ApiResult<T>,
        onSuccess: (T) -> Unit
    ) {
        if (!isViewActive || isLoading) {
            return
        }
        isLoading = true
        swipeRefresh.isRefreshing = true
        executor.execute {
            val result = action()
            mainHandler.post {
                if (!isViewActive) return@post
                swipeRefresh.isRefreshing = false
                isLoading = false
                when (result) {
                    is ApiResult.Success -> onSuccess(result.value)
                    is ApiResult.Failure -> renderFailure(result.error)
                }
            }
        }
    }

    private fun startAutoRefresh() {
        if (isAutoRefreshActive) return
        isAutoRefreshActive = true
        mainHandler.postDelayed(autoRefreshRunnable, AUTO_REFRESH_INTERVAL_MS)
    }

    private fun stopAutoRefresh() {
        if (!isAutoRefreshActive) return
        isAutoRefreshActive = false
        mainHandler.removeCallbacks(autoRefreshRunnable)
    }

    private fun formatRelativeTime(epochMs: Long): String {
        if (epochMs <= 0L) {
            return getString(R.string.sessions_time_unknown)
        }
        val deltaSec = ((System.currentTimeMillis() - epochMs) / 1000L).coerceAtLeast(0L)
        return when {
            deltaSec < 60L -> getString(R.string.sessions_time_just_now)
            deltaSec < 3600L -> getString(R.string.sessions_time_minutes_ago, deltaSec / 60L)
            deltaSec < 86400L -> getString(R.string.sessions_time_hours_ago, deltaSec / 3600L)
            else -> getString(R.string.sessions_time_days_ago, deltaSec / 86400L)
        }
    }

    companion object {
        private const val AUTO_REFRESH_INTERVAL_MS = 10_000L
    }
}
