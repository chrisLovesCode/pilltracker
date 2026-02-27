package com.pilltracker.app;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Log;
import android.webkit.WebView;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Print")
public class PrintPlugin extends Plugin {
  private static final String TAG = "MediRoutinePrint";

  @PluginMethod
  public void printCurrent(PluginCall call) {
    final String jobName = call.getString("jobName", "MediRoutine");

    getActivity().runOnUiThread(
        () -> {
          try {
            Log.d(TAG, "printCurrent called, jobName=" + jobName);
            PrintManager printManager =
                (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
            if (printManager == null) {
              Log.e(TAG, "PrintManager not available");
              call.reject("PrintManager not available");
              return;
            }

            WebView webView = bridge.getWebView();
            if (webView == null) {
              Log.e(TAG, "WebView not available");
              call.reject("WebView not available for printing");
              return;
            }

            PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(jobName);
            printManager.print(jobName, adapter, new PrintAttributes.Builder().build());
            Log.d(TAG, "Print job submitted");
            call.resolve();
          } catch (Exception e) {
            String message = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            Log.e(TAG, "printCurrent failed: " + message, e);
            call.reject(message, e);
          }
        });
  }
}
