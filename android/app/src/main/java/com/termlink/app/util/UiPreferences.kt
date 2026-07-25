package com.termlink.app.util

import android.content.Context
import android.provider.Settings
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat

/** Small, process-wide preferences shared by every Android surface. */
object UiPreferences {
    private const val PREFS_NAME = "ui_preferences"
    private const val KEY_THEME = "theme"
    private const val KEY_LANGUAGE = "language"
    private const val KEY_SCREEN_TIMEOUT_PROGRESS = "screen_timeout_progress"

    const val THEME_SYSTEM = "system"
    const val THEME_LIGHT = "light"
    const val THEME_DARK = "dark"

    const val LANGUAGE_SYSTEM = "system"
    const val LANGUAGE_ZH = "zh-CN"
    const val LANGUAGE_EN = "en"

    const val SCREEN_TIMEOUT_SYSTEM_PROGRESS = 0
    const val SCREEN_TIMEOUT_MIN_PROGRESS = 1
    const val SCREEN_TIMEOUT_MAX_PROGRESS = 20
    const val SCREEN_TIMEOUT_STEP_SECONDS = 30

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

    fun screenTimeoutProgress(context: Context): Int {
        val stored = try {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getInt(KEY_SCREEN_TIMEOUT_PROGRESS, SCREEN_TIMEOUT_SYSTEM_PROGRESS)
        } catch (_: ClassCastException) {
            SCREEN_TIMEOUT_SYSTEM_PROGRESS
        }
        return stored.coerceIn(SCREEN_TIMEOUT_SYSTEM_PROGRESS, SCREEN_TIMEOUT_MAX_PROGRESS)
    }

    fun setScreenTimeoutProgress(context: Context, progress: Int) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putInt(
                KEY_SCREEN_TIMEOUT_PROGRESS,
                progress.coerceIn(SCREEN_TIMEOUT_SYSTEM_PROGRESS, SCREEN_TIMEOUT_MAX_PROGRESS)
            )
            .apply()
    }

    fun screenTimeoutMillisForProgress(progress: Int): Long? {
        val normalized = progress.coerceIn(SCREEN_TIMEOUT_SYSTEM_PROGRESS, SCREEN_TIMEOUT_MAX_PROGRESS)
        if (normalized == SCREEN_TIMEOUT_SYSTEM_PROGRESS) {
            return null
        }
        return normalized.toLong() * SCREEN_TIMEOUT_STEP_SECONDS * 1_000L
    }

    fun screenTimeoutMillis(context: Context): Long? {
        return screenTimeoutMillisForProgress(screenTimeoutProgress(context))
    }

    fun systemScreenTimeoutMillis(context: Context): Long? {
        return try {
            Settings.System.getInt(
                context.contentResolver,
                Settings.System.SCREEN_OFF_TIMEOUT
            ).toLong().takeIf { it > 0L }
        } catch (_: Settings.SettingNotFoundException) {
            null
        } catch (_: SecurityException) {
            null
        }
    }

    fun foregroundScreenTimeoutMillis(context: Context): Long? {
        return effectiveForegroundScreenTimeoutMillis(
            configuredMillis = screenTimeoutMillis(context),
            systemMillis = systemScreenTimeoutMillis(context)
        )
    }

    fun effectiveForegroundScreenTimeoutMillis(
        configuredMillis: Long?,
        systemMillis: Long?
    ): Long? {
        if (configuredMillis == null) {
            return null
        }
        return if (systemMillis == null || configuredMillis > systemMillis) {
            configuredMillis
        } else {
            null
        }
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
