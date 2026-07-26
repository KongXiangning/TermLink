package com.termlink.app

import android.app.Application
import com.termlink.app.util.MainThreadWatchdog
import com.termlink.app.util.PersistentDiagnosticLog
import com.termlink.app.util.UiPreferences

class TermLinkApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        PersistentDiagnosticLog.initialize(this)
        MainThreadWatchdog.start()
        UiPreferences.apply(this)
    }
}
