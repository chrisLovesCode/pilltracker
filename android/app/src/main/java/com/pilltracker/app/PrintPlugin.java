package com.pilltracker.app;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Print")
public class PrintPlugin extends Plugin {
  @PluginMethod
  public void printCurrent(PluginCall call) {
    final String jobName = call.getString("jobName", "PillTracker");

    getActivity().runOnUiThread(
        () -> {
          try {
            PrintManager printManager =
                (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
            if (printManager == null) {
              call.reject("PrintManager not available");
              return;
            }

            PrintDocumentAdapter adapter = bridge.getWebView().createPrintDocumentAdapter(jobName);
            printManager.print(jobName, adapter, new PrintAttributes.Builder().build());
            call.resolve();
          } catch (Exception e) {
            call.reject(e.getMessage(), e);
          }
        });
  }
}
