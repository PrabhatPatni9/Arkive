package com.arkive.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NsdPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
