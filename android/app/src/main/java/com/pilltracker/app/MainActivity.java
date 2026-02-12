package com.pilltracker.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.community.database.sqlite.CapacitorSQLitePlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Explicit registration makes plugin availability more robust across devices/build variants.
    // Must happen before super.onCreate so Capacitor picks plugins up when initializing the bridge.
    registerPlugin(CapacitorSQLitePlugin.class);
    registerPlugin(PrintPlugin.class);
    super.onCreate(savedInstanceState);
    applySystemBarAppearance();
  }

  @Override
  public void onResume() {
    super.onResume();
    applySystemBarAppearance();
  }

  private void applySystemBarAppearance() {
    // Keep Android system bars readable on a light app background.
    Window window = getWindow();
    final int systemBarColor = Color.parseColor("#F3F8F6");
    window.setStatusBarColor(systemBarColor);
    window.setNavigationBarColor(systemBarColor);
    WindowCompat.setDecorFitsSystemWindows(window, true);

    WindowInsetsControllerCompat insetsController =
      WindowCompat.getInsetsController(window, window.getDecorView());
    if (insetsController != null) {
      insetsController.setAppearanceLightStatusBars(true);
      insetsController.setAppearanceLightNavigationBars(true);
    }

    // Legacy flags as fallback on OEM/API combinations where InsetsController is ignored.
    int flags = window.getDecorView().getSystemUiVisibility();
    flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
    flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
    window.getDecorView().setSystemUiVisibility(flags);
  }
}
