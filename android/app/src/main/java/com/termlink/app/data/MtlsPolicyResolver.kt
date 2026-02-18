package com.termlink.app.data

import com.termlink.app.BuildConfig
import java.util.Locale

enum class MtlsPolicyReason {
    ENABLED,
    DISABLED_BY_BUILD_CONFIG,
    DISABLED_BY_PROFILE,
    PROFILE_MISSING
}

data class MtlsPolicy(
    val effectiveEnabled: Boolean,
    val effectiveAllowedHosts: Set<String>,
    val reason: MtlsPolicyReason
)

object MtlsPolicyResolver {

    fun resolve(profile: ServerProfile?): MtlsPolicy {
        val resolvedHosts = parseAllowedHosts(resolveAllowedHostsRaw(profile))

        if (!BuildConfig.MTLS_ENABLED) {
            return MtlsPolicy(
                effectiveEnabled = false,
                effectiveAllowedHosts = resolvedHosts,
                reason = MtlsPolicyReason.DISABLED_BY_BUILD_CONFIG
            )
        }

        if (profile == null) {
            return MtlsPolicy(
                effectiveEnabled = false,
                effectiveAllowedHosts = resolvedHosts,
                reason = MtlsPolicyReason.PROFILE_MISSING
            )
        }

        if (!profile.mtlsEnabled) {
            return MtlsPolicy(
                effectiveEnabled = false,
                effectiveAllowedHosts = resolvedHosts,
                reason = MtlsPolicyReason.DISABLED_BY_PROFILE
            )
        }

        return MtlsPolicy(
            effectiveEnabled = true,
            effectiveAllowedHosts = resolvedHosts,
            reason = MtlsPolicyReason.ENABLED
        )
    }

    fun isHostAllowed(host: String?, allowedHosts: Set<String>): Boolean {
        if (allowedHosts.isEmpty()) {
            return true
        }
        val normalizedHost = normalizeHostToken(host)
        if (normalizedHost.isBlank()) {
            return false
        }
        return allowedHosts.contains(normalizedHost)
    }

    fun parseAllowedHosts(rawHosts: String?): Set<String> {
        if (rawHosts.isNullOrBlank()) {
            return emptySet()
        }
        return rawHosts
            .split(",")
            .map { normalizeHostToken(it) }
            .filter { it.isNotEmpty() }
            .toSet()
    }

    private fun normalizeHostToken(raw: String?): String {
        if (raw.isNullOrBlank()) return ""
        var token = raw.trim().lowercase(Locale.ROOT)
        if (token.contains("://")) {
            token = token.substringAfter("://")
        }
        token = token.substringBefore("/")

        // IPv6 literal with brackets, optional port: [::1]:442
        if (token.startsWith("[") && token.contains("]")) {
            return token.substringAfter("[").substringBefore("]")
        }

        // host:port -> host
        if (token.count { it == ':' } == 1) {
            token = token.substringBefore(":")
        }
        return token.trim()
    }

    private fun resolveAllowedHostsRaw(profile: ServerProfile?): String {
        val profileHosts = profile?.allowedHosts?.trim().orEmpty()
        if (profileHosts.isNotBlank()) {
            return profileHosts
        }
        return BuildConfig.MTLS_ALLOWED_HOSTS
    }
}
