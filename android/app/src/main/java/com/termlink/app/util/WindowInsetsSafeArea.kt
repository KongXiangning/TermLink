package com.termlink.app.util

import androidx.core.graphics.Insets
import androidx.core.view.WindowInsetsCompat
import kotlin.math.max

fun WindowInsetsCompat.statusBarSafeTopInset(): Int {
    val visibleSystemTop = getInsets(WindowInsetsCompat.Type.systemBars()).top
    val hiddenAwareStatusTop = getInsetsIgnoringVisibility(WindowInsetsCompat.Type.statusBars()).top
    val cutoutTop = displayCutout?.safeInsetTop ?: 0
    return max(visibleSystemTop, max(hiddenAwareStatusTop, cutoutTop))
}

fun WindowInsetsCompat.horizontalSafeInsets(): Insets {
    val gestureInsets = getInsetsIgnoringVisibility(WindowInsetsCompat.Type.systemGestures())
    val cutout = displayCutout
    return Insets.of(
        max(gestureInsets.left, cutout?.safeInsetLeft ?: 0),
        0,
        max(gestureInsets.right, cutout?.safeInsetRight ?: 0),
        0
    )
}
