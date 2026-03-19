package com.termlink.app.ui.terminal

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.termlink.app.R
import com.termlink.app.web.TerminalWebViewHost

class TerminalFragment : Fragment(R.layout.fragment_terminal) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val host = activity as? TerminalWebViewHost ?: return
        val container = view.findViewById<ViewGroup>(R.id.terminal_webview_container)
        host.attachTerminalWebView(container)
    }

    override fun onDestroyView() {
        (activity as? TerminalWebViewHost)?.detachTerminalWebView()
        super.onDestroyView()
    }
}
