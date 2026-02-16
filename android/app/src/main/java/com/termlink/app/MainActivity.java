package com.termlink.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void load() {
        super.load();
        if (bridge != null) {
            bridge.setWebViewClient(new MtlsBridgeWebViewClient(bridge, getApplicationContext()));
        }
    }
}
