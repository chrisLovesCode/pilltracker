package com.pilltracker.app

import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.web.assertion.WebViewAssertions.webMatches
import androidx.test.espresso.web.sugar.Web.onWebView
import androidx.test.espresso.web.webdriver.DriverAtoms.*
import androidx.test.espresso.web.webdriver.Locator
import androidx.test.espresso.web.model.Atoms
import org.hamcrest.Description
import org.hamcrest.Matchers.any
import org.hamcrest.TypeSafeMatcher
import org.json.JSONObject
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Generates deterministic screenshots on Android emulator/device.
 *
 * Important:
 * - We reset data via the DB debug modal (fast + deterministic).
 * - Before taking screenshots we hide the debug footer via injected CSS,
 *   so the images look like a release build.
 */
@RunWith(AndroidJUnit4::class)
class PillTrackerScreenshotTest {

    private fun webViewId(): Int {
        val ctx = InstrumentationRegistry.getInstrumentation().targetContext
        val id = ctx.resources.getIdentifier("webview", "id", ctx.packageName)
        if (id == 0) throw IllegalStateException("Failed to resolve R.id.webview")
        return id
    }

    private fun handleRuntimePermissions(device: UiDevice, timeoutMs: Long = 15000) {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            val allow =
                device.findObject(By.res("com.android.permissioncontroller:id/permission_allow_button"))
                    ?: device.findObject(By.res("com.android.permissioncontroller:id/permission_allow_foreground_only_button"))
                    ?: device.findObject(By.res("com.android.permissioncontroller:id/permission_allow_one_time_button"))
                    ?: device.findObject(By.res("com.google.android.permissioncontroller:id/permission_allow_button"))
                    ?: device.findObject(By.res("com.google.android.permissioncontroller:id/permission_allow_foreground_only_button"))
                    ?: device.findObject(By.res("com.google.android.permissioncontroller:id/permission_allow_one_time_button"))
                    ?: device.findObject(By.textContains("Allow"))
                    ?: device.findObject(By.textContains("ALLOW"))
                    ?: device.findObject(By.textContains("Zulassen"))
                    ?: device.findObject(By.textContains("ZULASSEN"))
                    ?: device.findObject(By.textContains("Erlauben"))
                    ?: device.findObject(By.textContains("ERLAUBEN"))
            if (allow != null) {
                try {
                    allow.click()
                    device.waitForIdle(1500)
                } catch (_: Throwable) {
                    device.waitForIdle(250)
                }
                continue
            }
            return
        }
    }

    private fun waitForCss(selector: String, device: UiDevice, timeoutMs: Long = 45000) {
        val end = System.currentTimeMillis() + timeoutMs
        var lastErr: Throwable? = null
        while (System.currentTimeMillis() < end) {
            handleRuntimePermissions(device, 1500)
            try {
                onWebView(withId(webViewId()))
                    .forceJavascriptEnabled()
                    .withElement(findElement(Locator.CSS_SELECTOR, selector))
                    .check(webMatches(getText(), any(String::class.java)))
                return
            } catch (t: Throwable) {
                lastErr = t
                Thread.sleep(250)
            }
        }
        throw AssertionError("Web element not found: $selector", lastErr)
    }

    private fun clickCss(selector: String, device: UiDevice, timeoutMs: Long = 45000) {
        waitForCss(selector, device, timeoutMs)
        onWebView(withId(webViewId()))
            .forceJavascriptEnabled()
            .withElement(findElement(Locator.CSS_SELECTOR, selector))
            .perform(webScrollIntoView())
            .perform(webClick())
    }

    private fun captureStringFromScript(scriptBody: String, device: UiDevice, timeoutMs: Long = 15000): String {
        var captured: String? = null
        val matcher = object : TypeSafeMatcher<String>() {
            override fun describeTo(description: Description) {
                description.appendText("capture script result")
            }

            override fun matchesSafely(item: String): Boolean {
                captured = item
                return true
            }
        }

        val end = System.currentTimeMillis() + timeoutMs
        var lastErr: Throwable? = null
        while (System.currentTimeMillis() < end) {
            handleRuntimePermissions(device, 1500)
            try {
                onWebView(withId(webViewId()))
                    .forceJavascriptEnabled()
                    .check(webMatches(Atoms.script(scriptBody, Atoms.castOrDie(String::class.java)), matcher))
                return captured ?: ""
            } catch (t: Throwable) {
                lastErr = t
                Thread.sleep(250)
            }
        }
        throw AssertionError("Failed to capture script result", lastErr)
    }

    private fun setInputValueByJs(selector: String, value: String, device: UiDevice, timeoutMs: Long = 45000) {
        waitForCss(selector, device, timeoutMs)
        val script = """
            var sel = ${JSONObject.quote(selector)};
            var v = ${JSONObject.quote(value)};
            var el = document.querySelector(sel);
            if (!el) return "NO_ELEMENT";
            el.focus();
            var proto = Object.getPrototypeOf(el);
            var desc = Object.getOwnPropertyDescriptor(proto, 'value');
            if (desc && desc.set) { desc.set.call(el, v); } else { el.value = v; }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return el.value;
        """.trimIndent()
        onWebView(withId(webViewId()))
            .forceJavascriptEnabled()
            .check(webMatches(Atoms.script(script, Atoms.castOrDie(String::class.java)), org.hamcrest.Matchers.equalTo(value)))
    }

    private fun setCheckboxByJs(selector: String, checked: Boolean, device: UiDevice, timeoutMs: Long = 45000) {
        waitForCss(selector, device, timeoutMs)
        val script = """
            var sel = ${JSONObject.quote(selector)};
            var want = ${if (checked) "true" else "false"};
            var el = document.querySelector(sel);
            if (!el) return "NO_ELEMENT";
            el.checked = want;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return el.checked ? "true" : "false";
        """.trimIndent()
        onWebView(withId(webViewId()))
            .forceJavascriptEnabled()
            .check(
                webMatches(
                    Atoms.script(script, Atoms.castOrDie(String::class.java)),
                    org.hamcrest.Matchers.equalTo(if (checked) "true" else "false")
                )
            )
    }

    private fun setSelectValueByJs(selector: String, value: String, device: UiDevice, timeoutMs: Long = 45000) {
        waitForCss(selector, device, timeoutMs)
        val script = """
            var sel = ${JSONObject.quote(selector)};
            var v = ${JSONObject.quote(value)};
            var el = document.querySelector(sel);
            if (!el) return "NO_ELEMENT";
            el.value = v;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return el.value;
        """.trimIndent()
        onWebView(withId(webViewId()))
            .forceJavascriptEnabled()
            .check(webMatches(Atoms.script(script, Atoms.castOrDie(String::class.java)), org.hamcrest.Matchers.equalTo(value)))
    }

    private data class DomRect(val left: Double, val top: Double, val right: Double, val bottom: Double, val dpr: Double) {
        fun centerX(): Double = (left + right) / 2.0
        fun centerY(): Double = (top + bottom) / 2.0
    }

    private fun getDomRect(cssSelector: String, device: UiDevice, timeoutMs: Long = 15000): DomRect {
        val script = """
            var sel = ${JSONObject.quote(cssSelector)};
            var el = document.querySelector(sel);
            if (!el) return "NO_ELEMENT";
            var r = el.getBoundingClientRect();
            var dpr = window.devicePixelRatio || 1;
            return JSON.stringify({left:r.left, top:r.top, right:r.right, bottom:r.bottom, dpr:dpr});
        """.trimIndent()
        val raw = captureStringFromScript(script, device, timeoutMs).trim()
        if (raw == "NO_ELEMENT" || raw.isEmpty()) throw AssertionError("Failed to locate element for rect: $cssSelector")
        val obj = JSONObject(raw)
        return DomRect(
            left = obj.getDouble("left"),
            top = obj.getDouble("top"),
            right = obj.getDouble("right"),
            bottom = obj.getDouble("bottom"),
            dpr = obj.getDouble("dpr")
        )
    }

    private fun swipeOnWebView(startCss: String, endCss: String, device: UiDevice, webViewLoc: IntArray, steps: Int = 40) {
        val start = getDomRect(startCss, device, 30000)
        val end = getDomRect(endCss, device, 30000)

        val sx = (webViewLoc[0] + start.centerX() * start.dpr).toInt()
        val sy = (webViewLoc[1] + start.centerY() * start.dpr).toInt()
        val ex = (webViewLoc[0] + (end.right - 8.0) * end.dpr).toInt()
        val ey = (webViewLoc[1] + end.centerY() * end.dpr).toInt()

        device.swipe(sx, sy, ex, ey, steps)
        device.waitForIdle(1500)
    }

    private fun firstGroupId(device: UiDevice, timeoutMs: Long = 30000): String {
        val script = """
            var el = document.querySelector("[data-testid^='group-card-']");
            if (!el) return "";
            var tid = el.getAttribute("data-testid") || "";
            return tid.replace("group-card-", "");
        """.trimIndent()
        val id = captureStringFromScript(script, device, timeoutMs).trim()
        if (id.isEmpty()) throw AssertionError("Failed to resolve first group id")
        return id
    }

    private fun medicationIdByName(name: String, device: UiDevice, timeoutMs: Long = 30000): String {
        val script = """
            var n = ${JSONObject.quote(name)};
            var cards = Array.from(document.querySelectorAll("[data-testid^='medication-card-']"));
            for (var i = 0; i < cards.length; i++) {
              var el = cards[i];
              var txt = (el.innerText || el.textContent || "");
              if (txt.indexOf(n) !== -1) {
                var tid = el.getAttribute("data-testid") || "";
                return tid.replace("medication-card-", "");
              }
            }
            return "";
        """.trimIndent()
        val id = captureStringFromScript(script, device, timeoutMs).trim()
        if (id.isEmpty()) throw AssertionError("Failed to resolve medication id by name: $name")
        return id
    }

    @Test
    fun test00_captureScreenshots() {
        val inst = InstrumentationRegistry.getInstrumentation()
        val device = UiDevice.getInstance(inst)

        // Avoid blocking runtime permission dialogs (Android 13+ notifications).
        // Best-effort: if it fails, UIAutomator handler below can still click.
        try {
            device.executeShellCommand(
                "sh -c \"pm grant com.pilltracker.app android.permission.POST_NOTIFICATIONS 2>/dev/null || true\""
            )
        } catch (_: Throwable) {
            // ignore
        }

        val scenario = ActivityScenario.launch(MainActivity::class.java)
        try {
            device.wait(Until.findObject(By.pkg("com.pilltracker.app")), 10000)
            device.waitForIdle(1500)
            handleRuntimePermissions(device, 8000)

            // UI ready.
            waitForCss("[aria-label='add-medication-button']", device, 60000)
            waitForCss("[aria-label='add-group-button']", device, 60000)

            // Force English UI for screenshots (i18next browser language detector caches in localStorage).
            val langResult = captureStringFromScript(
                """
                try {
                  var want = "en";
                  var cur = (localStorage.getItem("i18nextLng") || "");
                  if (cur.indexOf(want) === 0) return "already";
                  localStorage.setItem("i18nextLng", want);
                  setTimeout(function(){ location.reload(); }, 10);
                  return "reloading";
                } catch (e) {
                  return "error";
                }
                """.trimIndent(),
                device,
                15000
            )
            if (langResult.trim() == "reloading") {
                // Give the reload some time to start.
                Thread.sleep(1500)
                handleRuntimePermissions(device, 8000)
                waitForCss("[aria-label='add-medication-button']", device, 60000)
                waitForCss("[aria-label='add-group-button']", device, 60000)
            }

            // Resolve WebView location on screen for swipe gestures.
            val webViewLoc = IntArray(2)
            scenario.onActivity { activity ->
                val web = activity.findViewById<android.view.View>(webViewId())
                web.getLocationOnScreen(webViewLoc)
            }

            // Reset DB (alpha): init + clear tables.
            clickCss("[aria-label='open-db-debug']", device, 60000)
            clickCss("[aria-label='db-init']", device, 60000)
            clickCss("[aria-label='db-clear-tables']", device, 60000)
            clickCss("[aria-label='db-debug-close']", device, 60000)

            // Create one group.
            clickCss("[aria-label='add-group-button']", device)
            setInputValueByJs("[aria-label='group-name-input']", "Morning Routine", device)
            setInputValueByJs("[aria-label='group-notes-textarea']", "Base meds (example)", device)
            clickCss("[aria-label='save-group-button']", device, 60000)

            val gid = firstGroupId(device, 45000)

            fun createMed(name: String, amount: String, unit: String, time: String, groupId: String?) {
                clickCss("[aria-label='add-medication-button']", device)
                setInputValueByJs("[aria-label='medication-name-input']", name, device)
                setInputValueByJs("[aria-label='dosage-amount-input']", amount, device)
                setSelectValueByJs("[aria-label='dosage-unit-select']", unit, device)
                setInputValueByJs("[aria-label='schedule-time-0']", time, device)
                // Keep notifications enabled to show the capability, but avoid permission popups (handled above).
                setCheckboxByJs("[aria-label='notifications-checkbox']", true, device)
                if (groupId != null) {
                    setSelectValueByJs("[aria-label='group-select']", groupId, device)
                }
                clickCss("[aria-label='save-medication-button']", device, 60000)
                waitForCss("[aria-label^='track-medication-']", device, 60000)
            }

            createMed("Vitamin D3", "1", "tablets", "08:00", gid)
            createMed("Metformin", "500", "mg", "08:00", gid)
            createMed("Ibuprofen", "400", "mg", "12:00", null)

            // Track one intake so "Last taken" is visible.
            val metId = medicationIdByName("Metformin", device, 45000)
            swipeOnWebView(
                startCss = "[aria-label='track-medication-${metId}-handle']",
                endCss = "[aria-label='track-medication-${metId}']",
                device = device,
                webViewLoc = webViewLoc
            )
            waitForCss("[data-testid='medication-card-${metId}'] [aria-label='last-intake']", device, 60000)

            // Scroll to top for a clean home screenshot.
            captureStringFromScript("window.scrollTo(0,0); return \"ok\";", device, 10000)
            device.waitForIdle(1000)

            // Hide debug footer if present (so screenshots look like release build).
            captureStringFromScript(
                """
                var f = document.querySelector("footer");
                if (f) { f.style.setProperty("display","none","important"); }
                return "ok";
                """.trimIndent(),
                device,
                10000
            )

            val outPath = "/sdcard/Download/pilltracker-screenshots"
            device.executeShellCommand("mkdir -p ${outPath}")
            device.executeShellCommand("rm -f ${outPath}/android-home.png ${outPath}/android-edit-medication.png")
            device.executeShellCommand("screencap -p ${outPath}/android-home.png")

            // Open edit view for ibuprofen.
            val ibuId = medicationIdByName("Ibuprofen", device, 45000)
            clickCss("[aria-label='edit-medication-${ibuId}']", device, 60000)
            waitForCss("[aria-label='medication-name-input']", device, 60000)
            device.waitForIdle(1000)

            device.executeShellCommand("screencap -p ${outPath}/android-edit-medication.png")

            // Emit paths to logcat output (useful when pulling).
            println("SCREENSHOT_HOME=${outPath}/android-home.png")
            println("SCREENSHOT_EDIT=${outPath}/android-edit-medication.png")
        } finally {
            scenario.close()
        }
    }
}
