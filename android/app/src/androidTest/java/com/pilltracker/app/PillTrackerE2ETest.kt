package com.pilltracker.app

import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import androidx.test.uiautomator.By
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.web.assertion.WebViewAssertions.webMatches
import androidx.test.espresso.web.sugar.Web.onWebView
import androidx.test.espresso.web.webdriver.DriverAtoms.*
import androidx.test.espresso.web.webdriver.Locator
import androidx.test.espresso.web.model.Atoms
import org.hamcrest.Description
import org.hamcrest.Matchers.any
import org.hamcrest.Matchers.containsString
import org.hamcrest.Matchers.equalTo
import org.hamcrest.TypeSafeMatcher
import org.json.JSONObject
import java.util.Calendar
import org.junit.Assert.fail
import org.junit.Before
import org.junit.FixMethodOrder
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.MethodSorters

/**
 * PillTracker E2E Tests (WebView)
 *
 * Important: UIAutomator can't see DOM nodes inside WebView on modern Android.
 * We use Espresso-Web for DOM interaction and UiDevice only for:
 * - runtime permission dialogs
 * - logcat dump on failures
 */
@RunWith(AndroidJUnit4::class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
class PillTrackerE2ETest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    private lateinit var device: UiDevice

    companion object {
        private const val TEST_MED_NAME = "Test Aspirin"
        private const val TEST_NOTIF_MED_NAME = "Notif Test Med"
    }

    @Before
    fun setUp() {
        device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        device.waitForIdle(3000)
        // Ensure the app process exists (ActivityScenario should do this, but keep it deterministic).
        device.wait(Until.findObject(By.pkg("com.pilltracker.app")), 10000)
        device.waitForIdle(1500)
        handleRuntimePermissions(3000)
    }

    private fun webViewId(): Int {
        val ctx = InstrumentationRegistry.getInstrumentation().targetContext
        val id = ctx.resources.getIdentifier("webview", "id", ctx.packageName)
        if (id == 0) {
            throw IllegalStateException("Failed to resolve R.id.webview for package ${ctx.packageName}")
        }
        return id
    }

    private fun dumpLogcatFiltered(): String {
        return try {
            val filtered = device.executeShellCommand(
                "sh -c \"logcat -d | grep -E 'Capacitor/Console|\\\\[Notifications\\\\]|\\\\[Debug\\\\]|LocalNotifications|Database Initialization Failed|no such table|\\\\[DB\\\\]|\\\\[Main\\\\]|AndroidRuntime|CapacitorSQLite|sqlite|SQL|FATAL|ERROR' | tail -n 300\""
            ).trim()
            if (filtered.isNotEmpty()) filtered
            else device.executeShellCommand("sh -c \"logcat -d | tail -n 250\"")
        } catch (e: Exception) {
            "Failed to dump logcat: ${e.message}"
        }
    }

    private fun captureStringFromScript(scriptBody: String, timeoutMs: Long = 15000): String {
        // Atoms.script runs in a function body context. Use `return ...` in scriptBody.
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
            handleRuntimePermissions(1500)
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
        println("=== LOGCAT (captureStringFromScript failed) ===")
        println(dumpLogcatFiltered())
        println("=== /LOGCAT ===")
        throw AssertionError("Failed to capture script result", lastErr)
    }

    private data class DomRect(
        val left: Double,
        val top: Double,
        val right: Double,
        val bottom: Double,
        val dpr: Double,
    ) {
        fun centerX(): Double = (left + right) / 2.0
        fun centerY(): Double = (top + bottom) / 2.0
    }

    private fun getDomRect(cssSelector: String, timeoutMs: Long = 15000): DomRect {
        val script = """
            var sel = ${JSONObject.quote(cssSelector)};
            var el = document.querySelector(sel);
            if (!el) return "NO_ELEMENT";
            var r = el.getBoundingClientRect();
            var dpr = window.devicePixelRatio || 1;
            return JSON.stringify({left:r.left, top:r.top, right:r.right, bottom:r.bottom, dpr:dpr});
        """.trimIndent()

        val raw = captureStringFromScript(script, timeoutMs).trim()
        if (raw == "NO_ELEMENT" || raw.isEmpty()) {
            throw AssertionError("Failed to locate element for rect: $cssSelector (got: $raw)")
        }

        val obj = JSONObject(raw)
        return DomRect(
            left = obj.getDouble("left"),
            top = obj.getDouble("top"),
            right = obj.getDouble("right"),
            bottom = obj.getDouble("bottom"),
            dpr = obj.getDouble("dpr"),
        )
    }

    private fun swipeOnWebView(startCss: String, endCss: String, steps: Int = 40) {
        // Convert DOM coords (CSS px) -> screen coords (device px) using WebView location and DPR.
        val start = getDomRect(startCss, 30000)
        val end = getDomRect(endCss, 30000)

        val loc = IntArray(2)
        activityRule.scenario.onActivity { activity ->
            val web = activity.findViewById<android.view.View>(webViewId())
            web.getLocationOnScreen(loc)
        }

        val sx = (loc[0] + start.centerX() * start.dpr).toInt()
        val sy = (loc[1] + start.centerY() * start.dpr).toInt()
        val ex = (loc[0] + (end.right - 8.0) * end.dpr).toInt()
        val ey = (loc[1] + end.centerY() * end.dpr).toInt()

        device.swipe(sx, sy, ex, ey, steps)
        device.waitForIdle(1500)
    }

    private fun handleRuntimePermissions(timeoutMs: Long = 15000) {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            // Try to click Allow/OK on common runtime permission dialogs.
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
                    // Dialog may re-render between lookup and click (StaleObjectException). Retry.
                    device.waitForIdle(250)
                }
                continue
            }

            val ok =
                device.findObject(By.text("OK"))
                    ?: device.findObject(By.textContains("Continue"))
                    ?: device.findObject(By.textContains("CONTINUE"))
            if (ok != null) {
                try {
                    ok.click()
                    device.waitForIdle(1500)
                } catch (_: Throwable) {
                    device.waitForIdle(250)
                }
                continue
            }

            // Last resort: deny to unblock tests.
            val deny =
                device.findObject(By.res("com.android.permissioncontroller:id/permission_deny_button"))
                    ?: device.findObject(By.res("com.android.permissioncontroller:id/permission_deny_and_dont_ask_again_button"))
                    ?: device.findObject(By.res("com.google.android.permissioncontroller:id/permission_deny_button"))
                    ?: device.findObject(By.res("com.google.android.permissioncontroller:id/permission_deny_and_dont_ask_again_button"))
                    ?: device.findObject(By.textContains("Don't allow"))
                    ?: device.findObject(By.textContains("DON'T ALLOW"))
                    ?: device.findObject(By.textContains("Nicht zulassen"))
                    ?: device.findObject(By.textContains("NICHT ZULASSEN"))
            if (deny != null) {
                try {
                    deny.click()
                    device.waitForIdle(1500)
                } catch (_: Throwable) {
                    device.waitForIdle(250)
                }
                continue
            }

            // No permission UI detected anymore.
            return
        }
    }

    private fun waitForCss(selector: String, timeoutMs: Long = 30000) {
        val end = System.currentTimeMillis() + timeoutMs
        var lastErr: Throwable? = null
        while (System.currentTimeMillis() < end) {
            handleRuntimePermissions(1500)
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
        println("=== LOGCAT (waitForCss failed: $selector) ===")
        println(dumpLogcatFiltered())
        println("=== /LOGCAT ===")
        throw AssertionError("Web element not found: $selector", lastErr)
    }

    private fun waitForCssTextContains(selector: String, needle: String, timeoutMs: Long = 30000) {
        val end = System.currentTimeMillis() + timeoutMs
        var lastErr: Throwable? = null
        while (System.currentTimeMillis() < end) {
            handleRuntimePermissions(1500)
            try {
                onWebView(withId(webViewId()))
                    .forceJavascriptEnabled()
                    .withElement(findElement(Locator.CSS_SELECTOR, selector))
                    .check(webMatches(getText(), containsString(needle)))
                return
            } catch (t: Throwable) {
                lastErr = t
                Thread.sleep(250)
            }
        }
        println("=== LOGCAT (waitForCssTextContains failed: $selector contains \"$needle\") ===")
        println(dumpLogcatFiltered())
        println("=== /LOGCAT ===")
        throw AssertionError("Web element text did not contain needle: $selector contains $needle", lastErr)
    }

    private fun waitForXpath(xpath: String, timeoutMs: Long = 30000) {
        val end = System.currentTimeMillis() + timeoutMs
        var lastErr: Throwable? = null
        while (System.currentTimeMillis() < end) {
            handleRuntimePermissions(1500)
            try {
                onWebView(withId(webViewId()))
                    .forceJavascriptEnabled()
                    .withElement(findElement(Locator.XPATH, xpath))
                    .check(webMatches(getText(), any(String::class.java)))
                return
            } catch (t: Throwable) {
                lastErr = t
                Thread.sleep(250)
            }
        }
        println("=== LOGCAT (waitForXpath failed) ===")
        println("xpath=$xpath")
        println(dumpLogcatFiltered())
        println("=== /LOGCAT ===")
        throw AssertionError("Web element not found (xpath): $xpath", lastErr)
    }

    private fun clickCss(selector: String, timeoutMs: Long = 30000) {
        waitForCss(selector, timeoutMs)
        onWebView(withId(webViewId()))
            .forceJavascriptEnabled()
            .withElement(findElement(Locator.CSS_SELECTOR, selector))
            .perform(webScrollIntoView())
            .perform(webClick())
    }

    private fun setInputCss(selector: String, value: String, timeoutMs: Long = 30000) {
        waitForCss(selector, timeoutMs)
        onWebView(withId(webViewId()))
            .forceJavascriptEnabled()
            .withElement(findElement(Locator.CSS_SELECTOR, selector))
            .perform(webScrollIntoView())
            .perform(clearElement())
            .perform(webKeys(value))
    }

    private fun setInputValueByJs(selector: String, value: String, timeoutMs: Long = 30000) {
        // Some inputs (notably <input type="time">) can be flaky with webKeys in WebView.
        // Use JS to set value + dispatch input/change so React picks it up.
        waitForCss(selector, timeoutMs)
        val script = """
            var sel = ${JSONObject.quote(selector)};
            var v = ${JSONObject.quote(value)};
            var el = document.querySelector(sel);
            if (!el) return "NO_ELEMENT";
            el.focus();
            var desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
            if (desc && desc.set) {
              desc.set.call(el, v);
            } else {
              el.value = v;
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return el.value;
        """.trimIndent()

        onWebView(withId(webViewId()))
            .forceJavascriptEnabled()
            .check(
                webMatches(
                    Atoms.script(script, Atoms.castOrDie(String::class.java)),
                    equalTo(value)
                )
            )
    }

    private fun setCheckboxByJs(selector: String, checked: Boolean, timeoutMs: Long = 30000) {
        waitForCss(selector, timeoutMs)
        val script = """
            var sel = ${JSONObject.quote(selector)};
            var want = ${if (checked) "true" else "false"};
            var el = document.querySelector(sel);
            if (!el) return "NO_ELEMENT";
            el.focus();
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
                    equalTo(if (checked) "true" else "false")
                )
            )
    }

    private fun requireUiReady() {
        // The main UI should always have the action buttons.
        waitForCss("[aria-label='add-medication-button']", 45000)
        waitForCss("[aria-label='add-group-button']", 45000)
    }

    @Test
    fun test00_preflightDbInit() {
        try {
            requireUiReady()
        } catch (t: Throwable) {
            println("=== LOGCAT (preflight failed) ===")
            println(dumpLogcatFiltered())
            println("=== /LOGCAT ===")
            throw t
        }
    }

    @Test
    fun test01_createMedicationAndTrack() {
        requireUiReady()

        // Reset DB data via debug UI (no schema changes, just DELETE).
        clickCss("[aria-label='open-db-debug']")
        clickCss("[aria-label='db-init']", 45000)
        clickCss("[aria-label='db-clear-tables']", 45000)
        clickCss("[aria-label='db-debug-close']", 45000)

        // Create medication
        clickCss("[aria-label='add-medication-button']")
        setInputValueByJs("[aria-label='medication-name-input']", TEST_MED_NAME)
        setInputValueByJs("[aria-label='dosage-amount-input']", "1")
        setCheckboxByJs("[aria-label='notifications-checkbox']", false) // keep test deterministic (no schedules needed here)
        clickCss("[aria-label='save-medication-button']", 45000)

        // Verify medication is created by waiting for the track control to appear.
        // (DB was cleared above, so any track control belongs to this medication.)
        waitForCss("[aria-label^='track-medication-']", 45000)

        // Slide-to-track with a real swipe gesture on screen coordinates.
        // This avoids JS-based event synthesis, which is flaky in WebView.
        swipeOnWebView(
            startCss = "[aria-label^='track-medication-'][aria-label$='-handle']",
            endCss = "[aria-label^='track-medication-']"
        )

        // Verify last intake appears
        waitForCss("[aria-label='last-intake']", 45000)
    }

    @Test
    fun test02_openDbInfo() {
        requireUiReady()
        clickCss("[aria-label='open-db-debug']")
        clickCss("[aria-label='db-show-migrations']", 45000) // "DB Info" button (kept aria-label)
        clickCss("[aria-label='db-debug-close']", 45000)
    }

    @Test
    fun test03_openNotificationsDebug() {
        requireUiReady()
        clickCss("[aria-label='open-notifications-debug']")
        clickCss("[aria-label='notifications-debug-close']")
    }

    @Test
    fun test04_medicationNotificationsScheduleAndFire() {
        requireUiReady()

        // Ensure pending notifications are clean to keep assertions deterministic.
        clickCss("[aria-label='open-notifications-debug']")
        clickCss("[aria-label='notifications-debug-cancel-all']", 45000)
        clickCss("[aria-label='notifications-debug-close']")

        // Reset DB data via debug UI (avoid leftover meds + pending schedules).
        clickCss("[aria-label='open-db-debug']")
        clickCss("[aria-label='db-init']", 45000)
        clickCss("[aria-label='db-clear-tables']", 45000)
        clickCss("[aria-label='db-debug-close']", 45000)

        // Pick a schedule time ~1 minute in the future (HH:mm).
        val cal = Calendar.getInstance()
        cal.add(Calendar.MINUTE, 1)
        val hh = cal.get(Calendar.HOUR_OF_DAY)
        val mm = cal.get(Calendar.MINUTE)
        val hhmm = String.format("%02d:%02d", hh, mm)

        // Create medication with notifications enabled and near-future schedule time.
        clickCss("[aria-label='add-medication-button']")
        setInputValueByJs("[aria-label='medication-name-input']", TEST_NOTIF_MED_NAME)
        // Use a unique dosage so we can find it in the delivered notification body.
        setInputValueByJs("[aria-label='dosage-amount-input']", "777")
        // Default has notifications enabled and all days selected; just adjust time.
        setInputValueByJs("[aria-label='schedule-time-0']", hhmm)
        setCheckboxByJs("[aria-label='notifications-checkbox']", true)
        clickCss("[aria-label='save-medication-button']", 45000)

        // Verify medication visible (track control present).
        waitForCss("[aria-label^='track-medication-']", 45000)

        // Verify the app actually scheduled pending notifications for this medication.
        clickCss("[aria-label='open-notifications-debug']")
        clickCss("[aria-label='notifications-debug-pending']", 45000)
        waitForCss("[aria-label='notifications-debug-output']", 45000)
        // Pending output should show the configured time (HH:mm).
        waitForCssTextContains("[aria-label='notifications-debug-output']", hhmm, 45000)
        clickCss("[aria-label='notifications-debug-close']")

        // Background the app so notifications are visible in the shade.
        device.pressHome()

        // Wait for the actual reminder notification to show up.
        device.openNotification()
        val notif = device.wait(Until.findObject(By.textContains("777")), 140000)
        if (notif == null) {
            println("=== LOGCAT (medication notification not delivered) ===")
            println(dumpLogcatFiltered())
            println("=== /LOGCAT ===")
            fail("Medication notification was not delivered within timeout (scheduled for ~$hhmm)")
        }

        // Close shade and return.
        device.pressBack()
    }

    @Test
    fun test05_notificationsE2E() {
        requireUiReady()

        // Open notifications debug.
        clickCss("[aria-label='open-notifications-debug']")

        // Verify permissions are granted (or at least the debug call works).
        clickCss("[aria-label='notifications-debug-permissions']", 45000)
        waitForCss("[aria-label='notifications-debug-output']", 45000)
        // If the permission dialog appears, setUp()/wait loops should click Allow automatically.
        waitForCssTextContains("[aria-label='notifications-debug-output']", "Display:", 45000)

        // Schedule a test notification and verify it arrives in the system shade.
        clickCss("[aria-label='notifications-debug-test']", 45000)
        waitForCssTextContains("[aria-label='notifications-debug-output']", "Test-Benachrichtigung geplant", 45000)

        // Wait up to ~45s for delivery (debug helper schedules in 30s).
        device.waitForIdle(1500)
        device.openNotification()
        val notif =
            device.wait(Until.findObject(By.textContains("Test Benachrichtigung")), 45000)
                ?: device.wait(Until.findObject(By.textContains("Wenn du das siehst")), 5000)

        if (notif == null) {
            println("=== LOGCAT (notification not delivered) ===")
            println(dumpLogcatFiltered())
            println("=== /LOGCAT ===")
            fail("Test notification was not delivered to system notification shade within timeout")
        }

        // Close shade.
        device.pressBack()

        clickCss("[aria-label='notifications-debug-close']")
    }
}
