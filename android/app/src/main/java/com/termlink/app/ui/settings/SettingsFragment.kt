package com.termlink.app.ui.settings

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.termlink.app.R
import com.termlink.app.data.AuthType
import com.termlink.app.data.ServerConfigState
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.TerminalType
import java.io.File
import java.util.Locale
import java.util.UUID

class SettingsFragment : Fragment(R.layout.fragment_settings) {

    interface Callbacks {
        fun getServerConfigState(): ServerConfigState
        fun onUpsertProfile(profile: ServerProfile): ServerConfigState
        fun onDeleteProfile(profileId: String): ServerConfigState
        fun getBasicPassword(profileId: String): String?
        fun putBasicPassword(profileId: String, password: String)
        fun removeBasicPassword(profileId: String)
        fun hasMtlsCertificate(profileId: String): Boolean
        fun importMtlsCertificate(profileId: String, uri: Uri): Boolean
        fun removeMtlsCertificate(profileId: String)
        fun hasMtlsPassword(profileId: String): Boolean
        fun putMtlsPassword(profileId: String, password: String)
        fun removeMtlsPassword(profileId: String)
    }

    private data class MtlsDialogState(
        val profileId: String,
        val existingProfile: ServerProfile?,
        val mtlsCheck: CheckBox,
        val statusText: TextView,
        val chooseButton: Button,
        val removeButton: Button,
        val passwordInput: EditText,
        val existingCertificatePresent: Boolean,
        val existingPasswordPresent: Boolean,
        var stagedCertificateFile: File? = null,
        var stagedCertificateDisplayName: String? = null,
        var certificateRemoved: Boolean = false,
        var revertToggleOnCancel: Boolean = false
    )

    private var callbacks: Callbacks? = null
    private var currentState: ServerConfigState? = null
    private lateinit var profilesContainer: LinearLayout
    private lateinit var mtlsStatusText: TextView
    private lateinit var insecureTransportWarningText: TextView
    private var activeMtlsDialogState: MtlsDialogState? = null

    private val mtlsCertificatePickerLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            handleMtlsCertificatePickerResult(
                if (result.resultCode == Activity.RESULT_OK) {
                    result.data?.data
                } else {
                    null
                }
            )
        }

    override fun onAttach(context: android.content.Context) {
        super.onAttach(context)
        callbacks = context as? Callbacks
            ?: throw IllegalStateException("Host activity must implement SettingsFragment.Callbacks")
    }

    override fun onDetach() {
        cleanupActiveMtlsDialogState()
        callbacks = null
        super.onDetach()
    }

    override fun onDestroyView() {
        cleanupActiveMtlsDialogState()
        super.onDestroyView()
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        profilesContainer = view.findViewById(R.id.profiles_container)
        mtlsStatusText = view.findViewById(R.id.settings_mtls_status)
        insecureTransportWarningText = view.findViewById(R.id.settings_insecure_transport_warning)
        view.findViewById<Button>(R.id.btn_add_profile).setOnClickListener {
            showProfileDialog(null)
        }

        renderMtlsBuildStatus()
        refreshState()
    }

    private fun refreshState() {
        val state = callbacks?.getServerConfigState() ?: return
        renderState(state)
    }

    private fun renderState(state: ServerConfigState) {
        currentState = state
        renderProfileWarning(state)
        renderProfiles(state)
    }

    private fun renderMtlsBuildStatus() {
        mtlsStatusText.text = getString(R.string.settings_mtls_status_runtime)
    }

    private fun renderProfiles(state: ServerConfigState) {
        profilesContainer.removeAllViews()
        if (state.profiles.isEmpty()) {
            val empty = TextView(requireContext()).apply {
                text = getString(R.string.settings_profiles_empty)
                setTextColor(ContextCompat.getColor(requireContext(), R.color.sessions_text_secondary))
                textSize = 13f
            }
            profilesContainer.addView(empty)
            return
        }

        state.profiles.forEach { profile ->
            val itemView = layoutInflater.inflate(
                R.layout.item_server_profile,
                profilesContainer,
                false
            )
            val isDefault = profile.id == state.activeProfileId
            itemView.findViewById<TextView>(R.id.profile_name).text =
                if (isDefault) {
                    getString(R.string.settings_profile_name_active, profile.name)
                } else {
                    profile.name
                }
            itemView.findViewById<TextView>(R.id.profile_base_url).text =
                profile.baseUrl.ifBlank { getString(R.string.settings_profile_url_empty) }

            val basicMeta = if (profile.authType == AuthType.BASIC && profile.basicUsername.isNotBlank()) {
                getString(R.string.settings_profile_basic_username_meta, profile.basicUsername)
            } else {
                "-"
            }
            val mtlsSummary = ProfileMtlsSummaryResolver.resolve(
                profile = profile,
                certificatePresent = callbacks?.hasMtlsCertificate(profile.id) == true,
                passwordPresent = callbacks?.hasMtlsPassword(profile.id) == true
            )
            itemView.findViewById<TextView>(R.id.profile_meta).text = getString(
                R.string.settings_profile_meta,
                profile.terminalType.name,
                profile.authType.name,
                basicMeta,
                formatProfileMtlsSummary(mtlsSummary),
                profile.allowedHosts.ifBlank { "-" }
            )

            itemView.findViewById<Button>(R.id.btn_edit_profile).setOnClickListener {
                showProfileDialog(profile)
            }

            itemView.findViewById<Button>(R.id.btn_delete_profile).setOnClickListener {
                showDeleteConfirmation(profile)
            }

            profilesContainer.addView(itemView)
        }
    }

    private fun renderProfileWarning(state: ServerConfigState) {
        val active = state.profiles.firstOrNull { it.id == state.activeProfileId }
        if (active == null) {
            insecureTransportWarningText.visibility = View.GONE
            return
        }

        val normalized = active.baseUrl.trim()
        if (normalized.isBlank()) {
            insecureTransportWarningText.visibility = View.VISIBLE
            insecureTransportWarningText.text = getString(R.string.settings_empty_base_url_warning)
            return
        }
        if (normalized.lowercase(Locale.ROOT).startsWith("http://")) {
            insecureTransportWarningText.visibility = View.VISIBLE
            insecureTransportWarningText.text = getString(
                R.string.settings_insecure_transport_warning,
                normalized
            )
        } else {
            insecureTransportWarningText.visibility = View.GONE
        }
    }

    private fun formatProfileMtlsSummary(summary: ProfileMtlsSummary): String {
        return when (summary.status) {
            MtlsConfigStatus.DISABLED -> getString(R.string.settings_profile_mtls_summary_disabled)
            MtlsConfigStatus.CONFIGURED -> getString(
                R.string.settings_profile_mtls_summary_configured,
                summary.certificateDisplayName.ifBlank {
                    getString(R.string.settings_profile_mtls_certificate_unknown)
                }
            )

            MtlsConfigStatus.PENDING_CERTIFICATE ->
                getString(R.string.settings_profile_mtls_summary_pending_certificate)

            MtlsConfigStatus.PENDING_PASSWORD ->
                getString(R.string.settings_profile_mtls_summary_pending_password)

            MtlsConfigStatus.PENDING_CERTIFICATE_AND_PASSWORD ->
                getString(R.string.settings_profile_mtls_summary_pending_both)
        }
    }

    private fun showDeleteConfirmation(profile: ServerProfile) {
        val dialog = AlertDialog.Builder(requireContext())
            .setTitle(getString(R.string.settings_delete_profile))
            .setMessage(getString(R.string.settings_delete_profile_confirm, profile.name))
            .setNegativeButton(android.R.string.cancel, null)
            .setPositiveButton(R.string.settings_delete_profile) { _, _ ->
                callbacks?.removeBasicPassword(profile.id)
                callbacks?.onDeleteProfile(profile.id)?.let { updated ->
                    renderState(updated)
                }
            }
            .show()
        dialog.getButton(AlertDialog.BUTTON_POSITIVE)
            ?.setTextColor(ContextCompat.getColor(requireContext(), R.color.sessions_error))
        dialog.getButton(AlertDialog.BUTTON_NEGATIVE)
            ?.setTextColor(ContextCompat.getColor(requireContext(), R.color.sessions_text_secondary))
    }

    private fun showProfileDialog(existing: ServerProfile?) {
        cleanupActiveMtlsDialogState()

        val dialogView = layoutInflater.inflate(R.layout.dialog_server_profile, null)
        val inputName = dialogView.findViewById<EditText>(R.id.input_profile_name)
        val inputBaseUrl = dialogView.findViewById<EditText>(R.id.input_profile_base_url)
        val inputAllowedHosts = dialogView.findViewById<EditText>(R.id.input_profile_allowed_hosts)
        val mtlsCheck = dialogView.findViewById<CheckBox>(R.id.checkbox_profile_mtls)
        val mtlsStatusText = dialogView.findViewById<TextView>(R.id.text_profile_mtls_certificate_status)
        val mtlsChooseButton = dialogView.findViewById<Button>(R.id.btn_profile_mtls_choose_certificate)
        val mtlsRemoveButton = dialogView.findViewById<Button>(R.id.btn_profile_mtls_remove_certificate)
        val inputMtlsPassword = dialogView.findViewById<EditText>(R.id.input_profile_mtls_password)
        val terminalTypeSpinner = dialogView.findViewById<Spinner>(R.id.spinner_profile_terminal_type)
        val authSpinner = dialogView.findViewById<Spinner>(R.id.spinner_profile_auth_type)
        val basicContainer = dialogView.findViewById<LinearLayout>(R.id.basic_auth_container)
        val inputBasicUsername = dialogView.findViewById<EditText>(R.id.input_profile_basic_username)
        val inputBasicPassword = dialogView.findViewById<EditText>(R.id.input_profile_basic_password)

        val profileId = existing?.id ?: UUID.randomUUID().toString()
        val terminalTypeOptions = TerminalType.entries.map { it.name }
        val authOptions = AuthType.entries.map { it.name }
        val existingCertificatePresent = callbacks?.hasMtlsCertificate(profileId) == true
        val existingPasswordPresent = callbacks?.hasMtlsPassword(profileId) == true

        terminalTypeSpinner.adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_item,
            terminalTypeOptions
        ).also {
            it.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        }

        authSpinner.adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_item,
            authOptions
        ).also {
            it.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        }

        if (existing != null) {
            inputName.setText(existing.name)
            inputBaseUrl.setText(existing.baseUrl)
            inputAllowedHosts.setText(existing.allowedHosts)
            mtlsCheck.isChecked = existing.mtlsEnabled
            inputBasicUsername.setText(existing.basicUsername)
            inputBasicPassword.setText(callbacks?.getBasicPassword(existing.id).orEmpty())
            terminalTypeSpinner.setSelection(
                terminalTypeOptions.indexOf(existing.terminalType.name).coerceAtLeast(0)
            )
            authSpinner.setSelection(authOptions.indexOf(existing.authType.name).coerceAtLeast(0))
        } else {
            mtlsCheck.isChecked = false
            terminalTypeSpinner.setSelection(
                terminalTypeOptions.indexOf(TerminalType.TERMLINK_WS.name).coerceAtLeast(0)
            )
            authSpinner.setSelection(authOptions.indexOf(AuthType.NONE.name).coerceAtLeast(0))
        }

        val dialog = AlertDialog.Builder(requireContext())
            .setTitle(
                if (existing == null) {
                    getString(R.string.settings_add_profile)
                } else {
                    getString(R.string.settings_edit_profile)
                }
            )
            .setView(dialogView)
            .setNegativeButton(android.R.string.cancel, null)
            .setPositiveButton(android.R.string.ok, null)
            .create()

        val mtlsDialogState = MtlsDialogState(
            profileId = profileId,
            existingProfile = existing,
            mtlsCheck = mtlsCheck,
            statusText = mtlsStatusText,
            chooseButton = mtlsChooseButton,
            removeButton = mtlsRemoveButton,
            passwordInput = inputMtlsPassword,
            existingCertificatePresent = existingCertificatePresent,
            existingPasswordPresent = existingPasswordPresent
        )
        activeMtlsDialogState = mtlsDialogState

        val updateBasicVisibility = {
            val authType = AuthType.fromString(authSpinner.selectedItem?.toString())
            basicContainer.visibility = if (authType == AuthType.BASIC) View.VISIBLE else View.GONE
        }
        authSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                updateBasicVisibility()
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {
                updateBasicVisibility()
            }
        }
        updateBasicVisibility()

        inputMtlsPassword.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit

            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit

            override fun afterTextChanged(s: Editable?) {
                updateMtlsUi(mtlsDialogState)
            }
        })

        mtlsCheck.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked && !hasEffectiveCertificate(mtlsDialogState)) {
                launchMtlsCertificatePicker(mtlsDialogState, revertToggleOnCancel = true)
            }
            if (!isChecked) {
                mtlsDialogState.revertToggleOnCancel = false
            }
            updateMtlsUi(mtlsDialogState)
        }

        mtlsChooseButton.setOnClickListener {
            launchMtlsCertificatePicker(mtlsDialogState, revertToggleOnCancel = false)
        }

        mtlsRemoveButton.setOnClickListener {
            handleRemoveCertificate(mtlsDialogState)
        }

        dialog.setOnDismissListener {
            if (activeMtlsDialogState === mtlsDialogState) {
                cleanupActiveMtlsDialogState()
            }
        }

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE)
                ?.setTextColor(ContextCompat.getColor(requireContext(), R.color.sessions_primary))
            dialog.getButton(AlertDialog.BUTTON_NEGATIVE)
                ?.setTextColor(ContextCompat.getColor(requireContext(), R.color.sessions_text_secondary))
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                saveProfileDialog(
                    dialog = dialog,
                    existing = existing,
                    inputName = inputName,
                    inputBaseUrl = inputBaseUrl,
                    inputAllowedHosts = inputAllowedHosts,
                    terminalTypeSpinner = terminalTypeSpinner,
                    authSpinner = authSpinner,
                    inputBasicUsername = inputBasicUsername,
                    inputBasicPassword = inputBasicPassword,
                    mtlsDialogState = mtlsDialogState
                )
            }
            updateMtlsUi(mtlsDialogState)
            if (existing == null && mtlsCheck.isChecked && !hasEffectiveCertificate(mtlsDialogState)) {
                launchMtlsCertificatePicker(mtlsDialogState, revertToggleOnCancel = true)
            }
        }

        dialog.show()
    }

    private fun saveProfileDialog(
        dialog: AlertDialog,
        existing: ServerProfile?,
        inputName: EditText,
        inputBaseUrl: EditText,
        inputAllowedHosts: EditText,
        terminalTypeSpinner: Spinner,
        authSpinner: Spinner,
        inputBasicUsername: EditText,
        inputBasicPassword: EditText,
        mtlsDialogState: MtlsDialogState
    ) {
        val name = inputName.text.toString().trim()
        val normalizedUrl = normalizeBaseUrl(inputBaseUrl.text.toString())
        if (name.isBlank() || name.length > 64) {
            inputName.error = getString(R.string.settings_name_invalid)
            return
        }
        if (normalizedUrl == null) {
            inputBaseUrl.error = getString(R.string.settings_base_url_invalid)
            return
        }

        val authType = AuthType.fromString(authSpinner.selectedItem?.toString())
        val terminalType = TerminalType.fromString(terminalTypeSpinner.selectedItem?.toString())
        val basicUsername = inputBasicUsername.text.toString().trim()
        val inputPassword = inputBasicPassword.text.toString()
        val resolvedPassword = when {
            authType != AuthType.BASIC -> ""
            inputPassword.isNotBlank() -> inputPassword
            else -> callbacks?.getBasicPassword(mtlsDialogState.profileId).orEmpty()
        }

        if (authType == AuthType.BASIC && basicUsername.isBlank()) {
            inputBasicUsername.error = getString(R.string.settings_basic_username_required)
            return
        }
        if (authType == AuthType.BASIC && resolvedPassword.isBlank()) {
            inputBasicPassword.error = getString(R.string.settings_basic_password_required)
            return
        }

        val mtlsDecision = resolveMtlsDecision(mtlsDialogState)
        val sideEffects = ProfileSaveCoordinator.resolveSideEffects(authType, mtlsDecision)
        when (mtlsDecision.validationError) {
            MtlsValidationError.CERTIFICATE_REQUIRED -> {
                mtlsDialogState.statusText.text = getString(R.string.settings_profile_mtls_certificate_required)
                launchMtlsCertificatePicker(mtlsDialogState, revertToggleOnCancel = false)
                return
            }

            MtlsValidationError.PASSWORD_REQUIRED -> {
                mtlsDialogState.passwordInput.error =
                    getString(R.string.settings_profile_mtls_password_required)
                return
            }

            null -> {
                // continue
            }
        }

        if (mtlsDecision.shouldPersistStagedCertificate) {
            val stagedFile = mtlsDialogState.stagedCertificateFile
            val imported = stagedFile != null &&
                callbacks?.importMtlsCertificate(mtlsDialogState.profileId, Uri.fromFile(stagedFile)) == true
            if (!imported) {
                Toast.makeText(
                    requireContext(),
                    getString(R.string.settings_profile_mtls_import_failed),
                    Toast.LENGTH_SHORT
                ).show()
                return
            }
        }

        val updatedProfile = ServerProfile(
            id = mtlsDialogState.profileId,
            name = name,
            baseUrl = normalizedUrl,
            terminalType = terminalType,
            authType = authType,
            basicUsername = if (authType == AuthType.BASIC) basicUsername else "",
            mtlsEnabled = mtlsDecision.effectiveMtlsEnabled,
            allowedHosts = inputAllowedHosts.text.toString().trim(),
            mtlsCertificateDisplayName = mtlsDecision.effectiveCertificateDisplayName
        )

        callbacks?.onUpsertProfile(updatedProfile)?.let { updated ->
            if (sideEffects.persistBasicPassword) {
                callbacks?.putBasicPassword(mtlsDialogState.profileId, resolvedPassword)
            } else if (sideEffects.removeBasicPassword) {
                callbacks?.removeBasicPassword(mtlsDialogState.profileId)
            }

            if (sideEffects.clearMtlsMaterial) {
                callbacks?.removeMtlsCertificate(mtlsDialogState.profileId)
                callbacks?.removeMtlsPassword(mtlsDialogState.profileId)
            } else if (sideEffects.persistMtlsPassword) {
                callbacks?.putMtlsPassword(
                    mtlsDialogState.profileId,
                    mtlsDialogState.passwordInput.text.toString()
                )
            }

            renderState(updated)
            dialog.dismiss()
        }
    }

    private fun resolveMtlsDecision(state: MtlsDialogState): MtlsProfileFormDecision {
        return MtlsProfileFormResolver.resolve(
            MtlsProfileFormInput(
                isNewProfile = state.existingProfile == null,
                initialMtlsEnabled = state.existingProfile?.mtlsEnabled == true,
                initialCertificatePresent = state.existingCertificatePresent,
                initialPasswordPresent = state.existingPasswordPresent,
                initialCertificateDisplayName = state.existingProfile?.mtlsCertificateDisplayName.orEmpty(),
                mtlsChecked = state.mtlsCheck.isChecked,
                stagedCertificateDisplayName = state.stagedCertificateDisplayName,
                enteredPassword = state.passwordInput.text?.toString().orEmpty(),
                certificateRemoved = state.certificateRemoved
            )
        )
    }

    private fun updateMtlsUi(state: MtlsDialogState) {
        val decision = resolveMtlsDecision(state)
        state.statusText.text = when (decision.status) {
            MtlsConfigStatus.DISABLED -> getString(R.string.settings_profile_mtls_status_disabled)
            MtlsConfigStatus.CONFIGURED -> getString(
                R.string.settings_profile_mtls_status_configured,
                decision.effectiveCertificateDisplayName.ifBlank {
                    getString(R.string.settings_profile_mtls_certificate_unknown)
                }
            )

            MtlsConfigStatus.PENDING_CERTIFICATE -> getString(R.string.settings_profile_mtls_status_pending_certificate)
            MtlsConfigStatus.PENDING_PASSWORD -> {
                val displayName = state.stagedCertificateDisplayName
                    ?: state.existingProfile?.mtlsCertificateDisplayName
                    ?: getString(R.string.settings_profile_mtls_certificate_unknown)
                getString(R.string.settings_profile_mtls_status_pending_password, displayName)
            }

            MtlsConfigStatus.PENDING_CERTIFICATE_AND_PASSWORD ->
                getString(R.string.settings_profile_mtls_status_pending_both)
        }
        state.statusText.setTextColor(
            ContextCompat.getColor(
                requireContext(),
                when (decision.status) {
                    MtlsConfigStatus.DISABLED -> R.color.sessions_text_muted
                    MtlsConfigStatus.CONFIGURED -> R.color.sessions_primary
                    MtlsConfigStatus.PENDING_CERTIFICATE,
                    MtlsConfigStatus.PENDING_PASSWORD,
                    MtlsConfigStatus.PENDING_CERTIFICATE_AND_PASSWORD -> R.color.sessions_text_secondary
                }
            )
        )

        state.chooseButton.setText(
            if (decision.effectiveCertificatePresent) {
                R.string.settings_profile_mtls_replace_certificate
            } else {
                R.string.settings_profile_mtls_select_certificate
            }
        )
        state.removeButton.visibility = if (decision.effectiveCertificatePresent) {
            View.VISIBLE
        } else {
            View.GONE
        }
        state.passwordInput.hint = if (
            state.existingPasswordPresent &&
            state.stagedCertificateFile == null &&
            !state.certificateRemoved
        ) {
            getString(R.string.settings_profile_mtls_password_hint_keep_existing)
        } else {
            getString(R.string.settings_profile_mtls_password_hint)
        }
        if (decision.validationError != MtlsValidationError.PASSWORD_REQUIRED) {
            state.passwordInput.error = null
        }
    }

    private fun handleRemoveCertificate(state: MtlsDialogState) {
        if (state.stagedCertificateFile != null) {
            deleteStagedFile(state.stagedCertificateFile)
            state.stagedCertificateFile = null
            state.stagedCertificateDisplayName = null
        } else {
            state.certificateRemoved = true
        }
        state.revertToggleOnCancel = false

        val hadValidStoredMtls = state.existingProfile?.mtlsEnabled == true &&
            state.existingCertificatePresent &&
            state.existingPasswordPresent
        if (!hasEffectiveCertificate(state) && hadValidStoredMtls) {
            state.mtlsCheck.isChecked = false
        }
        if (!hasEffectiveCertificate(state) && state.existingProfile == null) {
            state.mtlsCheck.isChecked = false
        }
        updateMtlsUi(state)
    }

    private fun hasEffectiveCertificate(state: MtlsDialogState): Boolean {
        return state.stagedCertificateFile != null ||
            (state.existingCertificatePresent && !state.certificateRemoved)
    }

    private fun launchMtlsCertificatePicker(
        state: MtlsDialogState,
        revertToggleOnCancel: Boolean
    ) {
        state.revertToggleOnCancel = revertToggleOnCancel
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType("*/*")
            .putExtra(
                Intent.EXTRA_MIME_TYPES,
                arrayOf(
                    "application/x-pkcs12",
                    "application/octet-stream"
                )
            )
        mtlsCertificatePickerLauncher.launch(intent)
    }

    private fun handleMtlsCertificatePickerResult(uri: Uri?) {
        val state = activeMtlsDialogState ?: return
        if (uri == null) {
            if (state.revertToggleOnCancel && !hasEffectiveCertificate(state)) {
                state.mtlsCheck.isChecked = false
            }
            state.revertToggleOnCancel = false
            updateMtlsUi(state)
            return
        }

        val stagedFile = File(getMtlsDialogCacheDir(), "${state.profileId}.p12")
        if (!stageCertificate(uri, stagedFile)) {
            if (state.revertToggleOnCancel && !hasEffectiveCertificate(state)) {
                state.mtlsCheck.isChecked = false
            }
            state.revertToggleOnCancel = false
            Toast.makeText(
                requireContext(),
                getString(R.string.settings_profile_mtls_picker_failed),
                Toast.LENGTH_SHORT
            ).show()
            updateMtlsUi(state)
            return
        }

        deleteStagedFile(state.stagedCertificateFile)
        state.stagedCertificateFile = stagedFile
        state.stagedCertificateDisplayName = resolveCertificateDisplayName(uri)
        state.certificateRemoved = false
        state.revertToggleOnCancel = false
        if (!state.mtlsCheck.isChecked) {
            state.mtlsCheck.isChecked = true
        }
        updateMtlsUi(state)
    }

    private fun stageCertificate(uri: Uri, stagedFile: File): Boolean {
        val tempFile = File(stagedFile.parentFile, "${stagedFile.name}.tmp")
        return try {
            requireContext().contentResolver.openInputStream(uri)?.use { input ->
                tempFile.outputStream().use { output -> input.copyTo(output) }
            } ?: return false
            if (stagedFile.exists()) {
                stagedFile.delete()
            }
            tempFile.renameTo(stagedFile)
        } catch (_: Exception) {
            false
        } finally {
            if (tempFile.exists()) {
                tempFile.delete()
            }
        }
    }

    private fun resolveCertificateDisplayName(uri: Uri): String {
        requireContext().contentResolver.query(
            uri,
            arrayOf(OpenableColumns.DISPLAY_NAME),
            null,
            null,
            null
        )?.use { cursor ->
            val columnIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (columnIndex >= 0 && cursor.moveToFirst()) {
                val displayName = cursor.getString(columnIndex).orEmpty().trim()
                if (displayName.isNotBlank()) {
                    return displayName
                }
            }
        }
        return uri.lastPathSegment?.substringAfterLast('/')?.trim().orEmpty()
            .ifBlank { getString(R.string.settings_profile_mtls_certificate_unknown) }
    }

    private fun getMtlsDialogCacheDir(): File {
        return File(requireContext().cacheDir, "mtls-dialog").apply { mkdirs() }
    }

    private fun cleanupActiveMtlsDialogState() {
        deleteStagedFile(activeMtlsDialogState?.stagedCertificateFile)
        activeMtlsDialogState = null
    }

    private fun deleteStagedFile(file: File?) {
        if (file != null && file.exists()) {
            file.delete()
        }
    }

    private fun normalizeBaseUrl(rawValue: String): String? {
        val trimmed = rawValue.trim()
        if (trimmed.isEmpty()) {
            return ""
        }
        val withScheme = if (
            trimmed.startsWith("http://", ignoreCase = true) ||
            trimmed.startsWith("https://", ignoreCase = true)
        ) {
            trimmed
        } else {
            "http://$trimmed"
        }
        if (
            !withScheme.startsWith("http://", ignoreCase = true) &&
            !withScheme.startsWith("https://", ignoreCase = true)
        ) {
            return null
        }
        return withScheme.trimEnd('/')
    }
}
