package com.termlink.app.ui.sessions

import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ListView
import android.widget.ProgressBar
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.card.MaterialCardView
import com.termlink.app.R
import com.termlink.app.data.ApiResult
import com.termlink.app.data.ExternalSession
import com.termlink.app.data.ExternalSessionStore
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionApiClient
import com.termlink.app.data.SessionApiError
import com.termlink.app.data.SessionApiErrorCode
import com.termlink.app.data.SessionListCacheStore
import com.termlink.app.data.SessionMode
import com.termlink.app.data.WorkspacePickerTree
import com.termlink.app.data.SessionRef
import com.termlink.app.data.SessionSelection
import com.termlink.app.data.SessionSummary
import com.termlink.app.data.TerminalType
import java.text.DateFormat
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

open class SessionsFragment : Fragment(R.layout.fragment_sessions) {

    interface Callbacks {
        fun getProfiles(): List<ServerProfile>
        fun getCurrentSelection(): SessionSelection
        fun onOpenSession(selection: SessionSelection)
        fun onUpdateSessionSelection(selection: SessionSelection)
    }

    private var callbacks: Callbacks? = null

    private lateinit var sessionApiClient: SessionApiClient
    private lateinit var externalSessionStore: ExternalSessionStore
    private lateinit var sessionListCacheStore: SessionListCacheStore
    private val executor: ExecutorService = Executors.newFixedThreadPool(
        Runtime.getRuntime().availableProcessors().coerceIn(4, 12)
    )
    private val mainHandler = Handler(Looper.getMainLooper())
    private val autoRefreshRunnable = object : Runnable {
        override fun run() {
            if (isAutoRefreshActive && !refreshRequestTracker.hasInFlightWork()) {
                refreshSessions(showSpinner = false)
            }
            if (isAutoRefreshActive) {
                mainHandler.postDelayed(this, AUTO_REFRESH_INTERVAL_MS)
            }
        }
    }

    private var isViewActive = false
    private var isAutoRefreshActive = false
    private val refreshRequestTracker = SessionAsyncRequestTracker()
    private var hasCompletedInitialLocalFirstPaint = false
    private var currentViewGeneration = 0
    private var profiles: List<ServerProfile> = emptyList()
    private var currentSelection: SessionSelection = SessionSelection("", "")
    private var groupedSessions: List<ProfileGroupResult> = emptyList()
    private var visibleDataSource: SessionVisibleDataSource = SessionVisibleDataSource.NONE
    private var refreshStatus: SessionRefreshStatus = SessionRefreshStatus.IDLE
    private var lastSuccessfulSyncAtMillis: Long? = null

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
        externalSessionStore = ExternalSessionStore(requireContext().applicationContext)
        sessionListCacheStore = SessionListCacheStore(requireContext().applicationContext)
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
        currentViewGeneration += 1
        hasCompletedInitialLocalFirstPaint = false

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
        hasCompletedInitialLocalFirstPaint = false
        swipeRefresh.isRefreshing = false
        refreshRequestTracker.releaseRefreshForViewDestroy()
        refreshRequestTracker.invalidateActions()
        resetViewBoundSessionState()
        super.onDestroyView()
    }

    private fun refreshSessions(showSpinner: Boolean) {
        if (!isViewActive || !refreshRequestTracker.canStartRefresh()) {
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

        val requestId = refreshRequestTracker.startRefresh()
        if (showSpinner) {
            swipeRefresh.isRefreshing = true
        }
        beginRefreshStatus()

        val profilesSnapshot = profiles
        val viewGeneration = currentViewGeneration
        val shouldAttemptFirstPaint = !hasCompletedInitialLocalFirstPaint
        executor.execute {
            if (shouldAttemptFirstPaint) {
                val firstPaintSnapshot = buildGroupsFromCache(profilesSnapshot)
                postFirstPaint(Runnable {
                    if (SessionFirstPaintGate.shouldApply(
                            isLatestRefreshRequest = refreshRequestTracker.isActiveRefresh(requestId),
                            isViewActive = isViewActive,
                            callbackViewGeneration = viewGeneration,
                            currentViewGeneration = currentViewGeneration,
                            hasCompletedInitialLocalFirstPaint = hasCompletedInitialLocalFirstPaint
                        )
                    ) {
                        if (firstPaintSnapshot.groups.isNotEmpty()) {
                            renderGroupedSessions(firstPaintSnapshot.groups)
                            visibleDataSource = SessionVisibleDataSource.CACHE
                            lastSuccessfulSyncAtMillis = firstPaintSnapshot.latestFetchedAtMillis
                            renderStatusBanner()
                        }
                        hasCompletedInitialLocalFirstPaint = true
                    }
                })
            }

            val nextGroups = fetchProfileGroups(profilesSnapshot)
            val fetchedAt = System.currentTimeMillis()
            if (refreshRequestTracker.isActiveRefresh(requestId)) {
                persistRemoteGroupsToCache(nextGroups, fetchedAt)
            }
            mainHandler.post {
                if (!refreshRequestTracker.completeRefresh(requestId)) return@post
                swipeRefresh.isRefreshing = false
                if (!isViewActive) return@post
                val hasGroupErrors = nextGroups.any { it.error != null }
                val hasSuccessfulGroups = nextGroups.any { it.error == null }
                if (hasGroupErrors) {
                    if (hasSuccessfulGroups && visibleDataSource == SessionVisibleDataSource.NONE) {
                        refreshStatus = SessionRefreshStatus.FAILED
                        visibleDataSource = SessionVisibleDataSource.REMOTE
                        lastSuccessfulSyncAtMillis = fetchedAt
                        renderGroupedSessions(nextGroups)
                        renderStatusBanner()
                        return@post
                    }
                    handleRefreshFailure(nextGroups.firstNotNullOf { it.error })
                    return@post
                }
                refreshStatus = SessionRefreshStatus.IDLE
                visibleDataSource = SessionVisibleDataSource.REMOTE
                lastSuccessfulSyncAtMillis = fetchedAt
                renderGroupedSessions(nextGroups)
                renderStatusBanner()
            }
        }
    }

    private fun buildGroupsFromCache(profileList: List<ServerProfile>): FirstPaintSnapshot {
        val cachedProfiles = sessionListCacheStore.loadForProfiles(profileList)
        val externalSessionsByProfileId = profileList
            .asSequence()
            .filter { it.terminalType == TerminalType.EXTERNAL_WEB }
            .map { profile -> profile.id.trim() to loadExternalSessionSummaries(profile.id) }
            .filter { (_, sessions) -> sessions.isNotEmpty() }
            .toMap()
        val firstPaintGroups = SessionCacheGroupBuilder.build(
            profiles = profileList,
            cachedProfiles = cachedProfiles,
            externalSessionsByProfileId = externalSessionsByProfileId
        )
        return FirstPaintSnapshot(
            groups = firstPaintGroups.map { cached ->
                ProfileGroupResult(
                    profile = cached.profile,
                    sessions = cached.sessions,
                    error = null
                )
            },
            latestFetchedAtMillis = firstPaintGroups.mapNotNull { it.fetchedAt }.maxOrNull()
        )
    }

    private fun beginRefreshStatus() {
        refreshStatus = SessionRefreshStatus.LOADING
        renderStatusBanner()
    }

    private fun resetViewBoundSessionState() {
        groupedSessions = emptyList()
        visibleDataSource = SessionVisibleDataSource.NONE
        refreshStatus = SessionRefreshStatus.IDLE
        lastSuccessfulSyncAtMillis = null
    }

    private fun handleRefreshFailure(error: SessionApiError) {
        swipeRefresh.isRefreshing = false
        refreshStatus = SessionRefreshStatus.FAILED
        if (visibleDataSource != SessionVisibleDataSource.NONE && groupedSessions.isNotEmpty()) {
            renderStatusBanner()
            return
        }
        renderGlobalFailure(error)
    }

    private fun renderStatusBanner() {
        when (SessionStatusBannerResolver.resolve(visibleDataSource, refreshStatus)) {
            SessionStatusBanner.NONE -> {
                errorText.visibility = View.GONE
            }
            SessionStatusBanner.REFRESHING -> {
                errorText.visibility = View.VISIBLE
                errorText.setTextColor(ContextCompat.getColor(requireContext(), R.color.sessions_text_secondary))
                errorText.text = buildStatusBannerText(
                    baseText = getString(R.string.sessions_cache_refreshing)
                )
            }
            SessionStatusBanner.STALE -> {
                errorText.visibility = View.VISIBLE
                errorText.setTextColor(ContextCompat.getColor(requireContext(), R.color.sessions_error))
                errorText.text = buildStatusBannerText(
                    baseText = getString(R.string.sessions_cache_stale)
                )
            }
        }
    }

    private fun buildStatusBannerText(baseText: String): String {
        val lastSynced = lastSuccessfulSyncAtMillis ?: return baseText
        val formattedTime = DateFormat.getTimeInstance(DateFormat.SHORT).format(lastSynced)
        return getString(
            R.string.sessions_cache_last_synced,
            baseText,
            formattedTime
        )
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
                when (val result = listSessionsForProfile(profile)) {
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

    private fun persistRemoteGroupsToCache(
        groups: List<ProfileGroupResult>,
        fetchedAt: Long
    ) {
        SessionRemoteCacheWriteback.apply(
            groups = groups.map { group ->
                SessionRemoteCacheWritebackCandidate(
                    profile = group.profile,
                    sessions = group.sessions,
                    hasError = group.error != null
                )
            },
            fetchedAt = fetchedAt,
            replaceProfile = sessionListCacheStore::replaceProfile
        )
    }

    private fun listSessionsForProfile(profile: ServerProfile): ApiResult<List<SessionSummary>> {
        if (profile.terminalType == TerminalType.EXTERNAL_WEB) {
            return ApiResult.Success(loadExternalSessionSummaries(profile.id))
        }
        return sessionApiClient.listSessions(profile)
    }

    private fun loadExternalSessionSummaries(profileId: String): List<SessionSummary> {
        return externalSessionStore.list(profileId).map(::toExternalSessionSummary)
    }

    protected open fun postFirstPaint(task: Runnable) {
        mainHandler.post(task)
    }

    private fun toExternalSessionSummary(session: ExternalSession): SessionSummary {
        return SessionSummary(
            id = session.id,
            name = session.name,
            status = "LOCAL",
            activeConnections = 0,
            createdAt = session.createdAt,
            lastActiveAt = session.lastActiveAt,
            sessionMode = SessionMode.TERMINAL,
            cwd = null
        )
    }

    private fun createSessionForProfile(
        profile: ServerProfile,
        name: String,
        sessionMode: SessionMode,
        cwd: String?
    ): ApiResult<SessionRef> {
        if (profile.terminalType == TerminalType.EXTERNAL_WEB) {
            val created = externalSessionStore.create(profile.id, name)
            return ApiResult.Success(
                SessionRef(
                    id = created.id,
                    name = created.name,
                    sessionMode = SessionMode.TERMINAL,
                    cwd = null
                )
            )
        }
        return sessionApiClient.createSession(profile, name, sessionMode, cwd)
    }

    private fun renameSessionForProfile(
        profile: ServerProfile,
        sessionId: String,
        name: String
    ): ApiResult<SessionRef> {
        if (profile.terminalType == TerminalType.EXTERNAL_WEB) {
            val updated = externalSessionStore.rename(profile.id, sessionId, name)
                ?: return ApiResult.Failure(
                    SessionApiError(
                        code = SessionApiErrorCode.NOT_FOUND,
                        message = "External session not found."
                    )
                )
            return ApiResult.Success(
                SessionRef(
                    id = updated.id,
                    name = updated.name,
                    sessionMode = SessionMode.TERMINAL,
                    cwd = null
                )
            )
        }
        return sessionApiClient.renameSession(profile, sessionId, name)
    }

    private fun supportsCodexSessions(profile: ServerProfile): Boolean {
        return profile.terminalType == TerminalType.TERMLINK_WS
    }

    private fun buildSelection(profileId: String, session: SessionSummary): SessionSelection {
        return SessionSelection(
            profileId = profileId,
            sessionId = session.id,
            sessionMode = session.sessionMode,
            cwd = session.cwd
        )
    }

    private fun modeLabel(mode: SessionMode): String {
        return when (mode) {
            SessionMode.CODEX -> getString(R.string.sessions_mode_codex)
            SessionMode.TERMINAL -> getString(R.string.sessions_mode_terminal)
        }
    }

    private fun deleteSessionForProfile(profile: ServerProfile, sessionId: String): ApiResult<Unit> {
        if (profile.terminalType == TerminalType.EXTERNAL_WEB) {
            val deleted = externalSessionStore.delete(profile.id, sessionId)
            return if (deleted) {
                ApiResult.Success(Unit)
            } else {
                ApiResult.Failure(
                    SessionApiError(
                        code = SessionApiErrorCode.NOT_FOUND,
                        message = "External session not found."
                    )
                )
            }
        }
        return sessionApiClient.deleteSession(profile, sessionId)
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
            group.sessions.map { buildSelection(group.profile.id, it) }
        }
        val hasGroupErrors = groups.any { it.error != null }
        val selectionFallbackAllowed = groups.isNotEmpty() && !hasGroupErrors
        val selectionExists = availableSelections.any {
            it.profileId == currentSelection.profileId && it.sessionId == currentSelection.sessionId
        }
        if (selectionFallbackAllowed && currentSelection.sessionId.isNotBlank() && !selectionExists) {
            val fallback = availableSelections.firstOrNull()
                ?: SessionSelection(currentSelection.profileId, "")
            currentSelection = fallback
            callbacks?.onUpdateSessionSelection(fallback)
        }

        val selectedStrokeColor = ContextCompat.getColor(requireContext(), R.color.sessions_selected_stroke)
        val normalStrokeColor = ContextCompat.getColor(requireContext(), R.color.sessions_card_stroke)
        val selectedBackgroundColor = ContextCompat.getColor(requireContext(), R.color.sessions_card_bg_selected)
        val normalBackgroundColor = ContextCompat.getColor(requireContext(), R.color.sessions_card_bg)

        var totalSessions = 0
        groups.forEach { group ->
            val groupView = layoutInflater.inflate(
                R.layout.item_profile_group_card,
                listContainer,
                false
            )
            val groupName = groupView.findViewById<TextView>(R.id.group_profile_name)
            val groupCount = groupView.findViewById<TextView>(R.id.group_session_count)
            val groupUrl = groupView.findViewById<TextView>(R.id.group_profile_url)
            val groupError = groupView.findViewById<TextView>(R.id.group_error_text)
            val groupEmpty = groupView.findViewById<TextView>(R.id.group_empty_text)
            val groupSessionsContainer = groupView.findViewById<LinearLayout>(R.id.group_sessions_container)

            groupName.text = group.profile.name
            groupUrl.text = getString(
                R.string.sessions_group_url,
                group.profile.baseUrl.ifBlank { getString(R.string.sessions_profile_url_empty) }
            )

            val groupLoadError = group.error
            if (groupLoadError != null) {
                groupCount.text = getString(R.string.sessions_group_count, 0)
                groupError.text = getString(
                    R.string.sessions_group_error,
                    groupLoadError.code.name,
                    toDisplayErrorMessage(groupLoadError)
                )
                groupError.visibility = View.VISIBLE
                groupEmpty.visibility = View.GONE
                groupSessionsContainer.visibility = View.GONE
                listContainer.addView(groupView)
                return@forEach
            }

            if (group.sessions.isEmpty()) {
                groupCount.text = getString(R.string.sessions_group_count, 0)
                groupError.visibility = View.GONE
                groupEmpty.visibility = View.VISIBLE
                groupEmpty.text = getString(R.string.sessions_group_empty)
                groupSessionsContainer.visibility = View.GONE
                listContainer.addView(groupView)
                return@forEach
            }

            groupCount.text = getString(R.string.sessions_group_count, group.sessions.size)
            groupError.visibility = View.GONE
            groupEmpty.visibility = View.GONE
            groupSessionsContainer.visibility = View.VISIBLE

            group.sessions.forEach { session ->
                totalSessions += 1
                val itemView = layoutInflater.inflate(
                    R.layout.item_session,
                    groupSessionsContainer,
                    false
                )
                val isSelected = session.id == currentSelection.sessionId &&
                    group.profile.id == currentSelection.profileId

                val sessionCard = itemView.findViewById<MaterialCardView>(R.id.session_card)
                val nameText = itemView.findViewById<TextView>(R.id.session_name)
                val primaryMetaText = itemView.findViewById<TextView>(R.id.session_meta_primary)
                val secondaryMetaText = itemView.findViewById<TextView>(R.id.session_meta_secondary)
                val openButton = itemView.findViewById<Button>(R.id.btn_open_session)
                val renameButton = itemView.findViewById<Button>(R.id.btn_rename_session)
                val deleteButton = itemView.findViewById<Button>(R.id.btn_delete_session)

                nameText.text = if (isSelected) {
                    getString(R.string.sessions_item_name_selected, session.name)
                } else {
                    session.name
                }
                primaryMetaText.text = getString(
                    R.string.sessions_item_meta_primary,
                    modeLabel(session.sessionMode),
                    session.status,
                    session.activeConnections
                )
                secondaryMetaText.text = if (
                    session.sessionMode == SessionMode.CODEX && !session.cwd.isNullOrBlank()
                ) {
                    getString(
                        R.string.sessions_item_last_active_with_cwd,
                        formatRelativeTime(session.lastActiveAt),
                        session.cwd
                    )
                } else {
                    getString(
                        R.string.sessions_item_last_active,
                        formatRelativeTime(session.lastActiveAt)
                    )
                }
                sessionCard.strokeColor = if (isSelected) selectedStrokeColor else normalStrokeColor
                sessionCard.strokeWidth = if (isSelected) dpToPx(2) else dpToPx(1)
                sessionCard.setCardBackgroundColor(
                    if (isSelected) selectedBackgroundColor else normalBackgroundColor
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

                groupSessionsContainer.addView(itemView)
            }

            listContainer.addView(groupView)
        }

        emptyText.visibility = if (totalSessions == 0) View.VISIBLE else View.GONE
    }

    private fun renderGlobalFailure(error: SessionApiError) {
        groupedSessions = emptyList()
        visibleDataSource = SessionVisibleDataSource.NONE
        listContainer.removeAllViews()
        emptyText.visibility = View.GONE
        errorText.setTextColor(ContextCompat.getColor(requireContext(), R.color.sessions_error))
        errorText.visibility = View.VISIBLE
        errorText.text = getString(
            R.string.sessions_error_template,
            error.code.name,
            toDisplayErrorMessage(error)
        )
        swipeRefresh.isRefreshing = false
    }

    private fun toDisplayErrorMessage(error: SessionApiError): String {
        return when (error.code) {
            SessionApiErrorCode.AUTH_FAILED -> {
                getString(
                    R.string.sessions_error_auth_failed_hint,
                    error.message
                )
            }
            SessionApiErrorCode.AUTH_MISSING_CREDENTIALS -> {
                getString(
                    R.string.sessions_error_auth_missing_hint,
                    error.message
                )
            }
            else -> error.message
        }
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
        val modeContainer = dialogView.findViewById<View>(R.id.create_session_mode_container)
        val spinnerMode = dialogView.findViewById<Spinner>(R.id.spinner_create_session_mode)
        val cwdContainer = dialogView.findViewById<View>(R.id.create_session_cwd_container)
        val inputCwd = dialogView.findViewById<EditText>(R.id.input_create_session_cwd)
        val browseCwdButton = dialogView.findViewById<Button>(R.id.btn_browse_session_cwd)
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

        val modeAdapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_item,
            mutableListOf<String>()
        )
        modeAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerMode.adapter = modeAdapter
        var isUpdatingCreateDialogModeUi = false
        var lastModeProfileId: String? = null
        var hasAppliedInitialModeSelection = false

        fun selectedProfile(): ServerProfile? {
            val index = spinnerProfile.selectedItemPosition
            return profiles.getOrNull(index)
        }

        fun selectedSessionMode(profile: ServerProfile?): SessionMode {
            if (profile == null || !supportsCodexSessions(profile)) {
                return SessionMode.TERMINAL
            }
            return when (spinnerMode.selectedItemPosition) {
                1 -> SessionMode.CODEX
                else -> SessionMode.TERMINAL
            }
        }

        fun resolveSuggestedCodexWorkspacePath(): String {
            val currentInput = inputCwd.text?.toString()?.trim().orEmpty()
            if (currentInput.isNotBlank()) {
                return currentInput
            }
            return ""
        }

        fun updateCreateDialogModeUi(rebuildModeOptions: Boolean) {
            if (isUpdatingCreateDialogModeUi) return
            isUpdatingCreateDialogModeUi = true
            try {
                val profile = selectedProfile()
                val codexSupported = profile != null && supportsCodexSessions(profile)
                modeContainer.visibility = if (codexSupported) View.VISIBLE else View.GONE
                spinnerMode.isEnabled = codexSupported
                val shouldRebuildModeOptions = rebuildModeOptions || lastModeProfileId != profile?.id

                if (shouldRebuildModeOptions) {
                    val previousModeSelection = spinnerMode.selectedItemPosition
                    val modeOptions = if (codexSupported) {
                        listOf(
                            getString(R.string.sessions_mode_terminal),
                            getString(R.string.sessions_mode_codex)
                        )
                    } else {
                        listOf(getString(R.string.sessions_mode_terminal))
                    }
                    modeAdapter.clear()
                    modeAdapter.addAll(modeOptions)
                    modeAdapter.notifyDataSetChanged()

                    val preferredMode = when {
                        codexSupported && previousModeSelection == 1 -> 1
                        codexSupported && previousModeSelection == 0 -> 0
                        hasAppliedInitialModeSelection -> 0
                        currentSelection.profileId == profile?.id &&
                            currentSelection.sessionMode == SessionMode.CODEX &&
                            codexSupported -> 1
                        else -> 0
                    }
                    spinnerMode.setSelection(preferredMode, false)
                    lastModeProfileId = profile?.id
                    hasAppliedInitialModeSelection = true
                }

                val currentMode = selectedSessionMode(profile)
                val showCwd = currentMode == SessionMode.CODEX
                cwdContainer.visibility = if (showCwd) View.VISIBLE else View.GONE
                browseCwdButton.visibility = if (showCwd) View.VISIBLE else View.GONE
                browseCwdButton.isEnabled = codexSupported
                if (showCwd && inputCwd.text.isNullOrBlank()) {
                    val suggestedCwd = resolveSuggestedCodexWorkspacePath()
                    inputCwd.setText(suggestedCwd)
                    inputCwd.setSelection(inputCwd.text.length)
                }
                if (!showCwd) {
                    inputCwd.error = null
                }
            } finally {
                isUpdatingCreateDialogModeUi = false
            }
        }

        spinnerProfile.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                updateCreateDialogModeUi(rebuildModeOptions = true)
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {
                updateCreateDialogModeUi(rebuildModeOptions = true)
            }
        }
        spinnerMode.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                updateCreateDialogModeUi(rebuildModeOptions = false)
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {
                updateCreateDialogModeUi(rebuildModeOptions = false)
            }
        }
        browseCwdButton.setOnClickListener {
            val profile = selectedProfile()
            if (profile == null || profile.terminalType != TerminalType.TERMLINK_WS) {
                Toast.makeText(
                    requireContext(),
                    getString(R.string.sessions_cwd_browse_profile_required),
                    Toast.LENGTH_SHORT
                ).show()
                return@setOnClickListener
            }
            if (selectedSessionMode(profile) != SessionMode.CODEX) {
                Toast.makeText(
                    requireContext(),
                    getString(R.string.sessions_cwd_browse_codex_only),
                    Toast.LENGTH_SHORT
                ).show()
                return@setOnClickListener
            }
            showWorkspacePickerDialog(
                profile = profile,
                initialPath = inputCwd.text?.toString()?.trim().takeIf { !it.isNullOrBlank() }
                    ?: resolveSuggestedCodexWorkspacePath()
            ) { selectedPath ->
                inputCwd.setText(selectedPath)
                inputCwd.setSelection(inputCwd.text.length)
                inputCwd.error = null
            }
        }
        updateCreateDialogModeUi(rebuildModeOptions = true)

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
                val sessionMode = selectedSessionMode(profile)
                val cwd = inputCwd.text.toString().trim().takeIf { it.isNotBlank() }
                if (sessionMode == SessionMode.CODEX && cwd.isNullOrBlank()) {
                    inputCwd.error = getString(R.string.sessions_cwd_required)
                    return@setOnClickListener
                }
                runAction(
                    action = { createSessionForProfile(profile, name, sessionMode, cwd) },
                    onSuccess = { created ->
                        callbacks?.onOpenSession(
                            SessionSelection(
                                profileId = profile.id,
                                sessionId = created.id,
                                sessionMode = created.sessionMode,
                                cwd = created.cwd
                            )
                        )
                        refreshSessions(showSpinner = false)
                    }
                )
                dialog.dismiss()
            }
        }

        dialog.show()
    }

    private fun showWorkspacePickerDialog(
        profile: ServerProfile,
        initialPath: String?,
        onSelected: (String) -> Unit
    ) {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_workspace_picker, null, false)
        val currentPathText = dialogView.findViewById<TextView>(R.id.workspace_picker_current_path)
        val statusText = dialogView.findViewById<TextView>(R.id.workspace_picker_status)
        val progressBar = dialogView.findViewById<ProgressBar>(R.id.workspace_picker_progress)
        val listView = dialogView.findViewById<ListView>(R.id.workspace_picker_list)
        val entryLabels = mutableListOf<String>()
        val entryAdapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_list_item_1,
            entryLabels
        )
        listView.adapter = entryAdapter

        var activeTree: WorkspacePickerTree? = null
        var requestSeq = 0
        var isDialogOpen = true

        fun renderTree(tree: WorkspacePickerTree?, loading: Boolean, errorMessage: String?) {
            currentPathText.text = tree?.path ?: initialPath.orEmpty()
            progressBar.visibility = if (loading) View.VISIBLE else View.GONE
            statusText.visibility = if (loading || !errorMessage.isNullOrBlank() || (tree != null && tree.entries.isEmpty())) {
                View.VISIBLE
            } else {
                View.GONE
            }
            statusText.text = when {
                loading -> getString(R.string.workspace_picker_loading)
                !errorMessage.isNullOrBlank() -> getString(R.string.workspace_picker_error, errorMessage)
                tree != null && tree.entries.isEmpty() -> getString(R.string.workspace_picker_empty)
                else -> ""
            }
            entryLabels.clear()
            entryLabels.addAll((tree?.entries ?: emptyList()).map { entry ->
                if (entry.hidden) {
                    ".${entry.name}"
                } else {
                    entry.name
                }
            })
            entryAdapter.notifyDataSetChanged()
        }

        fun loadTree(path: String?) {
            val nextSeq = requestSeq + 1
            requestSeq = nextSeq
            renderTree(activeTree, loading = true, errorMessage = null)
            executor.execute {
                val result = sessionApiClient.getWorkspacePickerTree(profile, path)
                mainHandler.post {
                    if (!isDialogOpen || nextSeq != requestSeq) {
                        return@post
                    }
                    when (result) {
                        is ApiResult.Success -> {
                            activeTree = result.value
                            renderTree(activeTree, loading = false, errorMessage = null)
                        }
                        is ApiResult.Failure -> {
                            renderTree(activeTree, loading = false, errorMessage = result.error.message)
                        }
                    }
                }
            }
        }

        listView.onItemClickListener = AdapterView.OnItemClickListener { _, _, position, _ ->
            val tree = activeTree ?: return@OnItemClickListener
            val entry = tree.entries.getOrNull(position) ?: return@OnItemClickListener
            if (entry.type == "directory") {
                loadTree(entry.path)
            }
        }

        val dialog = AlertDialog.Builder(requireContext())
            .setTitle(getString(R.string.workspace_picker_title))
            .setView(dialogView)
            .setNegativeButton(android.R.string.cancel, null)
            .setNeutralButton(R.string.workspace_picker_up, null)
            .setPositiveButton(R.string.workspace_picker_select, null)
            .create()

        dialog.setOnShowListener {
            val positiveButton = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
            val neutralButton = dialog.getButton(AlertDialog.BUTTON_NEUTRAL)

            positiveButton.setOnClickListener {
                val tree = activeTree ?: return@setOnClickListener
                onSelected(tree.path)
                dialog.dismiss()
            }
            neutralButton.setOnClickListener {
                val tree = activeTree ?: return@setOnClickListener
                if (tree.canGoUp && !tree.parentPath.isNullOrBlank()) {
                    loadTree(tree.parentPath)
                }
            }
            loadTree(initialPath)
        }

        dialog.setOnDismissListener {
            isDialogOpen = false
            requestSeq += 1
        }
        dialog.show()
    }

    private fun showRenameDialog(profile: ServerProfile, session: SessionSummary) {
        showSessionNameDialog(
            title = getString(R.string.sessions_rename_title),
            initialValue = session.name
        ) { newName ->
            runAction(
                action = { renameSessionForProfile(profile, session.id, newName) },
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
                    action = { deleteSessionForProfile(profile, session.id) },
                    onSuccess = {
                        if (session.id == currentSelection.sessionId &&
                            profile.id == currentSelection.profileId
                        ) {
                            currentSelection = SessionSelection(profile.id, "")
                            callbacks?.onUpdateSessionSelection(currentSelection)
                        }
                        refreshSessions(showSpinner = false)
                    }
                )
            }
            .show()
    }

    private fun openSession(profileId: String, sessionId: String) {
        val session = groupedSessions
            .firstOrNull { it.profile.id == profileId }
            ?.sessions
            ?.firstOrNull { it.id == sessionId }
        currentSelection = session?.let { buildSelection(profileId, it) }
            ?: SessionSelection(profileId, sessionId)
        val selectedProfile = profiles.firstOrNull { it.id == profileId }
        if (selectedProfile?.terminalType == TerminalType.EXTERNAL_WEB) {
            externalSessionStore.touch(profileId, sessionId)
        }
        callbacks?.onOpenSession(currentSelection)
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
        if (!isViewActive || !refreshRequestTracker.canStartAction()) {
            return
        }
        val requestId = refreshRequestTracker.startAction()
        swipeRefresh.isRefreshing = true
        executor.execute {
            val result = action()
            mainHandler.post {
                if (!refreshRequestTracker.completeAction(requestId)) return@post
                swipeRefresh.isRefreshing = false
                if (!isViewActive) return@post
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

    private fun dpToPx(dp: Int): Int {
        return (dp * resources.displayMetrics.density).toInt()
    }

    private data class ProfileGroupResult(
        val profile: ServerProfile,
        val sessions: List<SessionSummary>,
        val error: SessionApiError?
    )

    private data class FirstPaintSnapshot(
        val groups: List<ProfileGroupResult>,
        val latestFetchedAtMillis: Long?
    )

    companion object {
        private const val AUTO_REFRESH_INTERVAL_MS = 10_000L
    }
}
