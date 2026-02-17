package com.termlink.app.ui.settings

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import com.termlink.app.BuildConfig
import com.termlink.app.R
import com.termlink.app.data.AuthType
import com.termlink.app.data.ServerConfigState
import com.termlink.app.data.ServerProfile
import java.util.Locale
import java.util.UUID

class SettingsFragment : Fragment(R.layout.fragment_settings) {

    interface Callbacks {
        fun getServerConfigState(): ServerConfigState
        fun onUpsertProfile(profile: ServerProfile): ServerConfigState
        fun onDeleteProfile(profileId: String): ServerConfigState
        fun onSetActiveProfile(profileId: String): ServerConfigState
    }

    private var callbacks: Callbacks? = null
    private var currentState: ServerConfigState? = null
    private lateinit var profilesContainer: LinearLayout
    private lateinit var mtlsStatusText: TextView
    private lateinit var insecureTransportWarningText: TextView

    override fun onAttach(context: android.content.Context) {
        super.onAttach(context)
        callbacks = context as? Callbacks
            ?: throw IllegalStateException("Host activity must implement SettingsFragment.Callbacks")
    }

    override fun onDetach() {
        callbacks = null
        super.onDetach()
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
        renderInsecureTransportWarning(state)
        renderProfiles(state)
    }

    private fun renderMtlsBuildStatus() {
        val status = if (BuildConfig.MTLS_ENABLED) {
            val hostsLabel = BuildConfig.MTLS_ALLOWED_HOSTS.ifBlank {
                getString(R.string.settings_mtls_any_hosts)
            }
            getString(
                R.string.settings_mtls_status_enabled,
                BuildConfig.MTLS_P12_ASSET,
                hostsLabel
            )
        } else {
            getString(R.string.settings_mtls_status_disabled)
        }
        mtlsStatusText.text = status
    }

    private fun renderProfiles(state: ServerConfigState) {
        profilesContainer.removeAllViews()
        if (state.profiles.isEmpty()) {
            val empty = TextView(requireContext()).apply {
                text = getString(R.string.settings_profiles_empty)
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
            val isActive = profile.id == state.activeProfileId
            itemView.findViewById<TextView>(R.id.profile_name).text =
                if (isActive) {
                    getString(R.string.settings_profile_name_active, profile.name)
                } else {
                    profile.name
                }
            itemView.findViewById<TextView>(R.id.profile_base_url).text =
                profile.baseUrl.ifBlank { getString(R.string.settings_profile_url_empty) }
            itemView.findViewById<TextView>(R.id.profile_meta).text = getString(
                R.string.settings_profile_meta,
                profile.authType.name,
                profile.mtlsEnabled.toString().uppercase(Locale.ROOT),
                profile.allowedHosts.ifBlank { "-" }
            )

            val btnSetActive = itemView.findViewById<Button>(R.id.btn_set_active_profile)
            btnSetActive.isEnabled = !isActive
            btnSetActive.setOnClickListener {
                callbacks?.onSetActiveProfile(profile.id)?.let { updated ->
                    renderState(updated)
                }
            }

            itemView.findViewById<Button>(R.id.btn_edit_profile).setOnClickListener {
                showProfileDialog(profile)
            }

            itemView.findViewById<Button>(R.id.btn_delete_profile).setOnClickListener {
                showDeleteConfirmation(profile)
            }

            profilesContainer.addView(itemView)
        }
    }

    private fun renderInsecureTransportWarning(state: ServerConfigState) {
        val active = state.profiles.firstOrNull { it.id == state.activeProfileId }
        if (active == null) {
            insecureTransportWarningText.visibility = View.GONE
            return
        }

        val normalized = active.baseUrl.trim().lowercase(Locale.ROOT)
        if (normalized.startsWith("http://")) {
            insecureTransportWarningText.visibility = View.VISIBLE
            insecureTransportWarningText.text = getString(
                R.string.settings_insecure_transport_warning,
                active.baseUrl
            )
        } else {
            insecureTransportWarningText.visibility = View.GONE
        }
    }

    private fun showDeleteConfirmation(profile: ServerProfile) {
        AlertDialog.Builder(requireContext())
            .setTitle(getString(R.string.settings_delete_profile))
            .setMessage(getString(R.string.settings_delete_profile_confirm, profile.name))
            .setNegativeButton(android.R.string.cancel, null)
            .setPositiveButton(R.string.settings_delete_profile) { _, _ ->
                callbacks?.onDeleteProfile(profile.id)?.let { updated ->
                    renderState(updated)
                }
            }
            .show()
    }

    private fun showProfileDialog(existing: ServerProfile?) {
        val dialogView = layoutInflater.inflate(R.layout.dialog_server_profile, null)
        val inputName = dialogView.findViewById<EditText>(R.id.input_profile_name)
        val inputBaseUrl = dialogView.findViewById<EditText>(R.id.input_profile_base_url)
        val inputAllowedHosts = dialogView.findViewById<EditText>(R.id.input_profile_allowed_hosts)
        val mtlsCheck = dialogView.findViewById<CheckBox>(R.id.checkbox_profile_mtls)
        val authSpinner = dialogView.findViewById<Spinner>(R.id.spinner_profile_auth_type)

        val authOptions = AuthType.entries.map { it.name }
        val authAdapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_item,
            authOptions
        )
        authAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        authSpinner.adapter = authAdapter

        if (existing != null) {
            inputName.setText(existing.name)
            inputBaseUrl.setText(existing.baseUrl)
            inputAllowedHosts.setText(existing.allowedHosts)
            mtlsCheck.isChecked = existing.mtlsEnabled
            val index = authOptions.indexOf(existing.authType.name).coerceAtLeast(0)
            authSpinner.setSelection(index)
        } else {
            mtlsCheck.isChecked = BuildConfig.MTLS_ENABLED
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

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val name = inputName.text.toString().trim()
                val normalizedUrl = normalizeBaseUrl(inputBaseUrl.text.toString())
                if (name.isBlank() || name.length > 64) {
                    inputName.error = getString(R.string.settings_name_invalid)
                    return@setOnClickListener
                }
                if (normalizedUrl == null) {
                    inputBaseUrl.error = getString(R.string.settings_base_url_invalid)
                    return@setOnClickListener
                }

                val authType = AuthType.fromString(authSpinner.selectedItem?.toString())
                val updatedProfile = ServerProfile(
                    id = existing?.id ?: UUID.randomUUID().toString(),
                    name = name,
                    baseUrl = normalizedUrl,
                    authType = authType,
                    mtlsEnabled = mtlsCheck.isChecked,
                    allowedHosts = inputAllowedHosts.text.toString().trim()
                )

                callbacks?.onUpsertProfile(updatedProfile)?.let { updated ->
                    renderState(updated)
                    dialog.dismiss()
                }
            }
        }

        dialog.show()
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
