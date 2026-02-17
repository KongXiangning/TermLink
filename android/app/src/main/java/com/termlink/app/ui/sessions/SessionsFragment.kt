package com.termlink.app.ui.sessions

import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.termlink.app.R
import com.termlink.app.data.ApiResult
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionApiClient
import com.termlink.app.data.SessionApiError
import com.termlink.app.data.SessionApiErrorCode
import com.termlink.app.data.SessionSelection
import com.termlink.app.data.SessionSummary
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class SessionsFragment : Fragment(R.layout.fragment_sessions) {

    interface Callbacks {
        fun getProfiles(): List<ServerProfile>
        fun getCurrentSelection(): SessionSelection
        fun onOpenSession(profileId: String, sessionId: String)
        fun onUpdateSessionSelection(profileId: String, sessionId: String)
    }

    private var callbacks: Callbacks? = null

    private lateinit var sessionApiClient: SessionApiClient
    private val executor: ExecutorService = Executors.newFixedThreadPool(
        Runtime.getRuntime().availableProcessors().coerceIn(4, 12)
    )
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
    private var profiles: List<ServerProfile> = emptyList()
    private var currentSelection: SessionSelection = SessionSelection("", "")
    private var groupedSessions: List<ProfileGroupResult> = emptyList()

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

        profiles = cb.getProfiles()
        currentSelection = cb.getCurrentSelection()
        renderProfileSummary()

        if (profiles.isEmpty()) {
            renderGlobalFailure(
                SessionApiError(
                    code = SessionApiErrorCode.EMPTY_BASE_URL,
                    message = getString(R.string.sessions_error_all_profiles_unavailable)
                )
            )
            return
        }

        isLoading = true
        if (showSpinner) {
            swipeRefresh.isRefreshing = true
        }

        executor.execute {
            val nextGroups = fetchProfileGroups(profiles)
            mainHandler.post {
                if (!isViewActive) return@post
                swipeRefresh.isRefreshing = false
                isLoading = false
                renderGroupedSessions(nextGroups)
            }
        }
    }

    private fun fetchProfileGroups(profileList: List<ServerProfile>): List<ProfileGroupResult> {
        val tasks = profileList.map { profile ->
            profile to executor.submit<ProfileGroupResult> {
                if (profile.baseUrl.isBlank()) {
                    return@submit ProfileGroupResult(
                        profile = profile,
                        sessions = emptyList(),
                        error = SessionApiError(
                            code = SessionApiErrorCode.EMPTY_BASE_URL,
                            message = "Base URL is empty for this profile."
                        )
                    )
                }
                when (val result = sessionApiClient.listSessions(profile)) {
                    is ApiResult.Success -> ProfileGroupResult(
                        profile = profile,
                        sessions = result.value,
                        error = null
                    )
                    is ApiResult.Failure -> ProfileGroupResult(
                        profile = profile,
                        sessions = emptyList(),
                        error = result.error
                    )
                }
            }
        }
        return tasks.map { (profile, future) ->
            try {
                future.get()
            } catch (ex: Exception) {
                ProfileGroupResult(
                    profile = profile,
                    sessions = emptyList(),
                    error = SessionApiError(
                        code = SessionApiErrorCode.UNKNOWN,
                        message = ex.message ?: "Unknown failure",
                        cause = ex
                    )
                )
            }
        }
    }

    private fun renderProfileSummary() {
        if (profiles.isEmpty()) {
            profileText.text = getString(R.string.sessions_profile_none)
            return
        }
        val currentName = profiles.firstOrNull { it.id == currentSelection.profileId }?.name ?: "-"
        profileText.text = getString(
            R.string.sessions_profile_active,
            profiles.size,
            currentName
        )
    }

    private fun renderGroupedSessions(groups: List<ProfileGroupResult>) {
        groupedSessions = groups
        errorText.visibility = View.GONE
        listContainer.removeAllViews()

        val availableSelections = groups.flatMap { group ->
            group.sessions.map { SessionSelection(group.profile.id, it.id) }
        }
        val selectionExists = availableSelections.any {
            it.profileId == currentSelection.profileId && it.sessionId == currentSelection.sessionId
        }
        if (currentSelection.sessionId.isNotBlank() && !selectionExists) {
            val fallback = availableSelections.firstOrNull() ?: SessionSelection(currentSelection.profileId, "")
            currentSelection = fallback
            callbacks?.onUpdateSessionSelection(fallback.profileId, fallback.sessionId)
        }

        var totalSessions = 0
        groups.forEach { group ->
            val header = TextView(requireContext()).apply {
                text = getString(
                    R.string.sessions_group_header,
                    group.profile.name,
                    group.profile.baseUrl.ifBlank { getString(R.string.sessions_profile_url_empty) }
                )
                textSize = 14f
                setPadding(0, 12, 0, 6)
            }
            listContainer.addView(header)

            val groupError = group.error
            if (groupError != null) {
                val errorView = TextView(requireContext()).apply {
                    text = getString(R.string.sessions_group_error, groupError.code.name, groupError.message)
                    textSize = 13f
                    setTextColor(0xFFB00020.toInt())
                    setPadding(0, 0, 0, 8)
                }
                listContainer.addView(errorView)
                return@forEach
            }

            if (group.sessions.isEmpty()) {
                val emptyGroup = TextView(requireContext()).apply {
                    text = getString(R.string.sessions_group_empty)
                    textSize = 13f
                    setPadding(0, 0, 0, 8)
                }
                listContainer.addView(emptyGroup)
                return@forEach
            }

            group.sessions.forEach { session ->
                totalSessions += 1
                val itemView = layoutInflater.inflate(R.layout.item_session, listContainer, false)
                val isSelected = session.id == currentSelection.sessionId &&
                    group.profile.id == currentSelection.profileId

                val nameText = itemView.findViewById<TextView>(R.id.session_name)
                val profileNameText = itemView.findViewById<TextView>(R.id.session_profile)
                val metaText = itemView.findViewById<TextView>(R.id.session_meta)
                val openButton = itemView.findViewById<Button>(R.id.btn_open_session)
                val renameButton = itemView.findViewById<Button>(R.id.btn_rename_session)
                val deleteButton = itemView.findViewById<Button>(R.id.btn_delete_session)

                nameText.text = if (isSelected) {
                    getString(R.string.sessions_item_name_selected, session.name)
                } else {
                    session.name
                }
                profileNameText.text = getString(R.string.sessions_item_profile, group.profile.name)
                metaText.text = getString(
                    R.string.sessions_item_meta,
                    session.status,
                    session.activeConnections,
                    formatRelativeTime(session.lastActiveAt)
                )

                itemView.setOnClickListener {
                    openSession(group.profile.id, session.id)
                }
                openButton.setOnClickListener {
                    openSession(group.profile.id, session.id)
                }
                renameButton.setOnClickListener {
                    showRenameDialog(group.profile, session)
                }
                deleteButton.setOnClickListener {
                    showDeleteDialog(group.profile, session)
                }

                listContainer.addView(itemView)
            }
        }

        emptyText.visibility = if (totalSessions == 0) View.VISIBLE else View.GONE
    }

    private fun renderGlobalFailure(error: SessionApiError) {
        groupedSessions = emptyList()
        listContainer.removeAllViews()
        emptyText.visibility = View.GONE
        errorText.visibility = View.VISIBLE
        errorText.text = getString(R.string.sessions_error_template, error.code.name, error.message)
        swipeRefresh.isRefreshing = false
        isLoading = false
    }

    private fun showCreateDialog() {
        if (profiles.isEmpty()) {
            renderGlobalFailure(
                SessionApiError(
                    code = SessionApiErrorCode.EMPTY_BASE_URL,
                    message = getString(R.string.sessions_error_all_profiles_unavailable)
                )
            )
            return
        }

        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_session_create, null, false)
        val inputName = dialogView.findViewById<EditText>(R.id.input_create_session_name)
        val spinnerProfile = dialogView.findViewById<Spinner>(R.id.spinner_create_session_profile)
        val profileLabels = profiles.map { profile ->
            "${profile.name} (${profile.baseUrl.ifBlank { getString(R.string.sessions_profile_url_empty) }})"
        }
        val adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_item,
            profileLabels
        )
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerProfile.adapter = adapter
        val currentProfileIndex = profiles.indexOfFirst { it.id == currentSelection.profileId }
        if (currentProfileIndex >= 0) {
            spinnerProfile.setSelection(currentProfileIndex)
        }

        val dialog = AlertDialog.Builder(requireContext())
            .setTitle(getString(R.string.sessions_create_title))
            .setView(dialogView)
            .setNegativeButton(android.R.string.cancel, null)
            .setPositiveButton(android.R.string.ok, null)
            .create()

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val name = inputName.text.toString().trim()
                if (name.isBlank() || name.length > 64) {
                    inputName.error = getString(R.string.sessions_name_invalid)
                    return@setOnClickListener
                }
                val profileIndex = spinnerProfile.selectedItemPosition
                if (profileIndex < 0 || profileIndex >= profiles.size) {
                    renderGlobalFailure(
                        SessionApiError(
                            code = SessionApiErrorCode.INVALID_BASE_URL,
                            message = getString(R.string.sessions_create_profile_required)
                        )
                    )
                    return@setOnClickListener
                }
                val profile = profiles[profileIndex]
                runAction(
                    action = { sessionApiClient.createSession(profile, name) },
                    onSuccess = { created ->
                        callbacks?.onOpenSession(profile.id, created.id)
                        refreshSessions(showSpinner = false)
                    }
                )
                dialog.dismiss()
            }
        }

        dialog.show()
    }

    private fun showRenameDialog(profile: ServerProfile, session: SessionSummary) {
        showSessionNameDialog(
            title = getString(R.string.sessions_rename_title),
            initialValue = session.name
        ) { newName ->
            runAction(
                action = { sessionApiClient.renameSession(profile, session.id, newName) },
                onSuccess = {
                    refreshSessions(showSpinner = false)
                }
            )
        }
    }

    private fun showDeleteDialog(profile: ServerProfile, session: SessionSummary) {
        AlertDialog.Builder(requireContext())
            .setTitle(getString(R.string.sessions_delete_title))
            .setMessage(getString(R.string.sessions_delete_confirm, session.name))
            .setNegativeButton(android.R.string.cancel, null)
            .setPositiveButton(R.string.sessions_delete_title) { _, _ ->
                runAction(
                    action = { sessionApiClient.deleteSession(profile, session.id) },
                    onSuccess = {
                        if (session.id == currentSelection.sessionId &&
                            profile.id == currentSelection.profileId
                        ) {
                            callbacks?.onUpdateSessionSelection(profile.id, "")
                            currentSelection = SessionSelection(profile.id, "")
                        }
                        refreshSessions(showSpinner = false)
                    }
                )
            }
            .show()
    }

    private fun openSession(profileId: String, sessionId: String) {
        currentSelection = SessionSelection(profileId, sessionId)
        callbacks?.onOpenSession(profileId, sessionId)
        renderGroupedSessions(groupedSessions)
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
                    is ApiResult.Failure -> renderGlobalFailure(result.error)
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

    private data class ProfileGroupResult(
        val profile: ServerProfile,
        val sessions: List<SessionSummary>,
        val error: SessionApiError?
    )

    companion object {
        private const val AUTO_REFRESH_INTERVAL_MS = 10_000L
    }
}
