package com.termlink.app;

import com.getcapacitor.BridgeActivity;

// Retained as a migration fallback. Phase 2 launcher moved to MainShellActivity.
public class MainActivity extends BridgeActivity {

    @Override
    protected void load() {
        super.load();
        if (bridge != null) {
            bridge.setWebViewClient(new MtlsBridgeWebViewClient(bridge, getApplicationContext()));
        }
    }
}
