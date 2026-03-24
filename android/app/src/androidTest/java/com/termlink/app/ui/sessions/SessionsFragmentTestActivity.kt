package com.termlink.app.ui.sessions

import android.os.Bundle
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionSelection

class SessionsFragmentTestActivity : AppCompatActivity(), SessionsFragment.Callbacks {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val container = FrameLayout(this).apply {
            id = CONTAINER_ID
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }
        setContentView(container)
        if (savedInstanceState == null) {
            supportFragmentManager.beginTransaction()
                .replace(CONTAINER_ID, SessionsFragment())
                .commitNow()
        }
    }

    override fun getProfiles(): List<ServerProfile> = TestState.profiles

    override fun getCurrentSelection(): SessionSelection = TestState.selection

    override fun onOpenSession(selection: SessionSelection) {
        TestState.selection = selection
    }

    override fun onUpdateSessionSelection(selection: SessionSelection) {
        TestState.selection = selection
    }

    companion object {
        private const val CONTAINER_ID = 0x5E551045
    }
}

internal object TestState {
    var profiles: List<ServerProfile> = emptyList()
    var selection: SessionSelection = SessionSelection("", "")

    fun reset() {
        profiles = emptyList()
        selection = SessionSelection("", "")
    }
}
