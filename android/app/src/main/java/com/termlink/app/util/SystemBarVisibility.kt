package com.termlink.app.util

import android.app.Activity
import android.os.Build
import android.view.View
import android.view.WindowManager
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

fun Activity.setStatusBarHidden(hidden: Boolean, anchor: View? = null) {
    val target = anchor ?: window.decorView
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        window.attributes = window.attributes.apply {
            layoutInDisplayCutoutMode = if (hidden) {
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            } else {
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT
            }
        }
    }
    val controller = WindowInsetsControllerCompat(window, target)
    controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    if (hidden) {
        controller.hide(WindowInsetsCompat.Type.statusBars())
    } else {
        controller.show(WindowInsetsCompat.Type.statusBars())
    }
}
