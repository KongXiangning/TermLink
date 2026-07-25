package com.termlink.app

import android.app.Application
import com.termlink.app.util.UiPreferences

class TermLinkApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        UiPreferences.apply(this)
    }
}
