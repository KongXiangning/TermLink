package com.termlink.app.util

import androidx.core.view.WindowInsetsCompat
import kotlin.math.max

fun WindowInsetsCompat.statusBarSafeTopInset(): Int {
    val visibleSystemTop = getInsets(WindowInsetsCompat.Type.systemBars()).top
    val hiddenAwareStatusTop = getInsetsIgnoringVisibility(WindowInsetsCompat.Type.statusBars()).top
    val cutoutTop = displayCutout?.safeInsetTop ?: 0
    return max(visibleSystemTop, max(hiddenAwareStatusTop, cutoutTop))
}
