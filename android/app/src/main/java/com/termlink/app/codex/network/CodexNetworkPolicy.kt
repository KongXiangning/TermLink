package com.termlink.app.codex.network

enum class CodexMediaRequestKind {
    THUMBNAIL,
    AUTO_ORIGINAL,
    EXPLICIT_ORIGINAL
}

/** Product policy kept pure so Wi‑Fi behavior is testable without a device. */
object CodexNetworkPolicy {
    fun shouldDownload(
        kind: CodexMediaRequestKind,
        autoOriginalsWifiOnly: Boolean,
        isWifi: Boolean
    ): Boolean = when (kind) {
        CodexMediaRequestKind.THUMBNAIL,
        CodexMediaRequestKind.EXPLICIT_ORIGINAL -> true
        CodexMediaRequestKind.AUTO_ORIGINAL -> autoOriginalsWifiOnly && isWifi
    }
}
