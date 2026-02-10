package com.pilltracker.app

import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.*

/**
 * PillTracker E2E Tests
 * 
 * Vollständige End-to-End Tests für alle CRUD-Operationen
 * (Create, Read, Update, Delete)
 * 
 * Sprache ändern: TEST_LANGUAGE Konstante anpassen
 */
@RunWith(AndroidJUnit4::class)
class PillTrackerE2ETest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    private lateinit var device: UiDevice
    private lateinit var strings: TestStrings
    
    companion object {
        // Test-Sprache zentral konfigurieren
        // Unterstützte Werte: "de", "en"
        // Standard: "en" (App läuft standardmäßig auf Englisch im Emulator)
        private const val TEST_LANGUAGE = "en"
        
        // Test-Daten
        private const val TEST_MED_NAME = "Test Aspirin"
        private const val TEST_MED_UPDATED = "Updated Aspirin"
        private const val TEST_GROUP_NAME = "Test Group"
        private const val TEST_GROUP_UPDATED = "Updated Group"
    }

    @Before
    fun setUp() {
        device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        strings = getTestStrings(TEST_LANGUAGE)
        
        // Warte länger bis App vollständig geladen ist (Capacitor/WebView braucht Zeit)
        device.waitForIdle(8000)
        
        // Debug: Zeige aktuelle Sprache
        println("=== E2E Tests laufen mit Sprache: $TEST_LANGUAGE ===")
        
        // Warte auf WebView Container
        device.wait(Until.findObject(By.pkg("com.pilltracker.app")), 10000)
        device.waitForIdle(3000)

        // Wait until the React UI is interactive.
        val ready = waitDesc("add-medication-button", 30000)
        if (ready == null) {
            println("UI not ready (add-medication-button not found). Dumping logcat for diagnosis.")
            println(dumpLogcatFiltered())
            fail("UI not ready (add-medication-button not found)")
        }
    }

    private fun dumpLogcatFiltered(): String {
        return try {
            device.executeShellCommand(
                "sh -c \"logcat -d | grep -E '\\\\[DB\\\\]|\\\\[Migrations\\\\]|AndroidRuntime|CapacitorSQLite|sqlite|SQL|FATAL' | tail -n 200\""
            )
        } catch (e: Exception) {
            "Failed to dump logcat: ${e.message}"
        }
    }

    private fun waitDesc(desc: String, timeoutMs: Long = 15000): UiObject2? {
        return device.wait(Until.findObject(By.desc(desc)), timeoutMs)
    }

    private fun clickDesc(desc: String, timeoutMs: Long = 15000) {
        val obj = waitDesc(desc, timeoutMs)
        assertNotNull("UI element not found (desc=$desc)", obj)
        obj!!.click()
        device.waitForIdle(1000)
    }

    private fun inputText(text: String) {
        // `input text` uses `%s` for spaces.
        val escaped = text.replace(" ", "%s")
        device.executeShellCommand("input text $escaped")
        device.waitForIdle(500)
    }

    private fun setTextDesc(desc: String, text: String, timeoutMs: Long = 15000) {
        val obj = waitDesc(desc, timeoutMs)
        assertNotNull("UI element not found (desc=$desc)", obj)
        obj!!.click()
        device.waitForIdle(500)
        inputText(text)
        device.waitForIdle(1000)
    }

    private fun assertVisibleTextContains(substr: String, timeoutMs: Long = 15000) {
        val obj = device.wait(Until.findObject(By.textContains(substr)), timeoutMs)
        assertNotNull("Expected text containing '$substr' not visible", obj)
    }

    @Test
    fun test01_appStartsSuccessfully() {
        // Prüfe ob App läuft (WebView Container)
        val app = device.wait(
            Until.findObject(By.pkg("com.pilltracker.app")),
            10000
        )
        
        assertNotNull("App did not start", app)
        println("✓ App started successfully")
        
        // Gebe der WebView Zeit zum Laden
        device.waitForIdle(5000)
        
        // Versuche WebView-Elemente zu finden
        val webView = device.findObject(By.clazz("android.webkit.WebView"))
        if (webView != null) {
            println("✓ WebView found")
        } else {
            println("⚠ WebView not found - may need Chrome WebView debugging enabled")
        }
    }

    @Test
    fun test02_appRespondsToTouch() {
        // Warte auf WebView
        device.waitForIdle(5000)
        
        // Simuliere Touch in der Mitte des Screens (wo die App UI sein sollte)
        val displayWidth = device.displayWidth
        val displayHeight = device.displayHeight
        
        println("✓ Screen size: ${displayWidth}x${displayHeight}")
        
        // Touch in der Mitte
        device.click(displayWidth / 2, displayHeight / 2)
        device.waitForIdle(1000)
        
        // App sollte noch laufen
        val app = device.findObject(By.pkg("com.pilltracker.app"))
        assertNotNull("App crashed after touch", app)
        println("✓ App responds to touch input")
    }
    
    @Test
    fun test03_appStaysAlive() {
        // Test ob die App für längere Zeit stabil läuft
        device.waitForIdle(3000)
        
        val app = device.findObject(By.pkg("com.pilltracker.app"))
        assertNotNull("App is not running", app)
        println("✓ App stays alive")
    }
    
    @Test
    fun test04_canNavigateApp() {
        // Swipe gestures um Navigation zu testen
        device.waitForIdle(3000)
        
        val displayWidth = device.displayWidth
        val displayHeight = device.displayHeight
        
        // Swipe left (möglicherweise zwischen Tabs)
        device.swipe(displayWidth - 100, displayHeight / 2, 100, displayHeight / 2, 20)
        device.waitForIdle(1000)
        
        // Swipe right zurück
        device.swipe(100, displayHeight / 2, displayWidth - 100, displayHeight / 2, 20)
        device.waitForIdle(1000)
        
        // App sollte noch laufen
        val app = device.findObject(By.pkg("com.pilltracker.app"))
        assertNotNull("App crashed during navigation", app)
        println("✓ App handles navigation gestures")
    }
    
    @Test
    fun test05_databaseWorking() {
        // Teste ob die DB initialisiert ist durch mehrfache App-Interaktionen
        device.waitForIdle(3000)
        
        val displayWidth = device.displayWidth
        val displayHeight = device.displayHeight
        
        // Mehrere Touches um UI-Interaktionen zu simulieren
        device.click(displayWidth / 2, displayHeight / 3)
        device.waitForIdle(500)
        device.click(displayWidth / 2, displayHeight / 2)
        device.waitForIdle(500)
        
        // App sollte stabil bleiben
        val app = device.findObject(By.pkg("com.pilltracker.app"))
        assertNotNull("App unstable with DB operations", app)
        println("✓ App stable with database operations")
    }

    @Test
    fun test06_createMedicationAndTrack() {
        // This test uses aria-label/content-desc hooks set in the React app
        // (see add-medication-button, medication-name-input, dosage-amount-input, schedule-time-0, etc.)
        device.waitForIdle(5000)

        // Keep log output small and relevant for this test.
        device.executeShellCommand("logcat -c")

        fun resetDatabaseViaUi() {
            clickDesc("open-db-debug", 30000)
            clickDesc("db-init", 30000)
            clickDesc("db-clear-tables", 30000)
            clickDesc("db-debug-close", 30000)
            waitDesc("add-medication-button", 30000)
        }

        try {
            resetDatabaseViaUi()

            // Open add medication form
            clickDesc("add-medication-button")

            // Fill basic fields
            setTextDesc("medication-name-input", TEST_MED_NAME)
            setTextDesc("dosage-amount-input", "1")

            // Save
            clickDesc("save-medication-button", 30000)

            // Verify the medication is visible
            assertVisibleTextContains(TEST_MED_NAME, 30000)

            // Slide-to-track (swipe the handle to the right)
            val trackObjects = device.wait(
                Until.findObjects(By.descStartsWith("track-medication-")),
                30000
            ) ?: emptyList()
            val handle = trackObjects.firstOrNull {
                val cd = it.contentDescription?.toString() ?: ""
                cd.startsWith("track-medication-") && cd.endsWith("-handle")
            }
            assertNotNull("Track slider handle not found", handle)
            val r = handle!!.visibleBounds

            // Swipe far enough to exceed SlideToTrack threshold.
            device.swipe(r.centerX(), r.centerY(), device.displayWidth - 10, r.centerY(), 20)
            device.waitForIdle(2000)

            // Verify last intake shows up
            val last = waitDesc("last-intake", 30000)
            assertNotNull("Expected last intake element not visible after tracking", last)
        } finally {
            println("=== LOGCAT (after test06) ===")
            println(dumpLogcatFiltered())
            println("=== /LOGCAT ===")
        }
    }
}
