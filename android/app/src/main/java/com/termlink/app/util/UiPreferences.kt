package com.termlink.app.util

import android.content.Context
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat

/** Small, process-wide preferences shared by every Android surface. */
object UiPreferences {
    private const val PREFS_NAME = "ui_preferences"
    private const val KEY_THEME = "theme"
    private const val KEY_LANGUAGE = "language"

    const val THEME_SYSTEM = "system"
    const val THEME_LIGHT = "light"
    const val THEME_DARK = "dark"

    const val LANGUAGE_SYSTEM = "system"
    const val LANGUAGE_ZH = "zh-CN"
    const val LANGUAGE_EN = "en"

    fun theme(context: Context): String = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .getString(KEY_THEME, THEME_SYSTEM) ?: THEME_SYSTEM

    fun language(context: Context): String = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .getString(KEY_LANGUAGE, LANGUAGE_SYSTEM) ?: LANGUAGE_SYSTEM

    fun setTheme(context: Context, value: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_THEME, value)
            .apply()
    }

    fun setLanguage(context: Context, value: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_LANGUAGE, value)
            .apply()
    }

    fun apply(context: Context) {
        AppCompatDelegate.setDefaultNightMode(
            when (theme(context)) {
                THEME_LIGHT -> AppCompatDelegate.MODE_NIGHT_NO
                THEME_DARK -> AppCompatDelegate.MODE_NIGHT_YES
                else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
            }
        )
        AppCompatDelegate.setApplicationLocales(
            when (language(context)) {
                LANGUAGE_ZH -> LocaleListCompat.forLanguageTags(LANGUAGE_ZH)
                LANGUAGE_EN -> LocaleListCompat.forLanguageTags(LANGUAGE_EN)
                else -> LocaleListCompat.getEmptyLocaleList()
            }
        )
    }
}
