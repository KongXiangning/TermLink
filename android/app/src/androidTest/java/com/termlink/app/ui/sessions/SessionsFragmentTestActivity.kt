package com.termlink.app.ui.sessions

import android.os.Bundle
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionSelection

class SessionsFragmentTestActivity : AppCompatActivity(), SessionsFragment.Callbacks {

    val controlledFirstPaintScheduler = ControlledFirstPaintScheduler()

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
            val fragment = TestSessionsFragment(controlledFirstPaintScheduler)
            supportFragmentManager.beginTransaction()
                .add(CONTAINER_ID, fragment, TAG_SESSIONS_FRAGMENT)
                .apply {
                    if (intent?.getBooleanExtra(EXTRA_START_HIDDEN, false) == true) {
                        hide(fragment)
                    }
                }
                .commitNow()
        }
    }

    fun showSessionsFragment() {
        val fragment = requireSessionsFragment()
        if (!fragment.isHidden) {
            return
        }
        supportFragmentManager.beginTransaction()
            .show(fragment)
            .commitNow()
    }

    fun hideSessionsFragment() {
        val fragment = requireSessionsFragment()
        if (fragment.isHidden) {
            return
        }
        supportFragmentManager.beginTransaction()
            .hide(fragment)
            .commitNow()
    }

    fun getSessionsFragment(): SessionsFragment = requireSessionsFragment()

    override fun getProfiles(): List<ServerProfile> = TestState.profiles

    override fun getCurrentSelection(): SessionSelection = TestState.selection

    override fun onOpenSession(selection: SessionSelection) {
        TestState.selection = selection
    }

    override fun onUpdateSessionSelection(selection: SessionSelection) {
        TestState.selection = selection
    }

    private fun requireSessionsFragment(): SessionsFragment {
        return supportFragmentManager.findFragmentByTag(TAG_SESSIONS_FRAGMENT) as SessionsFragment
    }

    companion object {
        private const val CONTAINER_ID = 0x5E551045
        private const val TAG_SESSIONS_FRAGMENT = "sessions_fragment"
        const val EXTRA_START_HIDDEN = "start_hidden"
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
