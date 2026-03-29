package com.termlink.app.util

import java.util.Locale

/**
 * Resolves the system locale into a WebView i18n locale tag.
 * Chinese variants (zh-CN, zh-TW, zh-HK, etc.) → "zh-CN";
 * everything else → "en".
 */
object LocaleHelper {

    fun resolveWebViewLocale(): String {
        val lang = Locale.getDefault().language
        return if (lang == "zh") "zh-CN" else "en"
    }

    /**
     * Appends `&lang=<locale>` to a URL that already contains a `?` query string.
     */
    fun appendLangParam(url: String): String {
        val locale = resolveWebViewLocale()
        val separator = if (url.contains('?')) '&' else '?'
        return "$url${separator}lang=$locale"
    }
}
