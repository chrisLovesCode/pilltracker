package com.pilltracker.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.community.database.sqlite.CapacitorSQLitePlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Explicit registration makes plugin availability more robust across devices/build variants.
    registerPlugin(CapacitorSQLitePlugin.class);
    registerPlugin(PrintPlugin.class);
  }
}
