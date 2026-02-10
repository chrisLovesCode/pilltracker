package com.pilltracker.app

/**
 * Test String Localization
 * 
 * Zentrale Verwaltung aller UI-Strings für E2E Tests.
 * Um eine neue Sprache hinzuzufügen:
 * 1. Neue object TestStringsEn : TestStrings() erstellen
 * 2. Alle Strings übersetzen
 * 3. In getTestStrings() die neue Sprache hinzufügen
 */
abstract class TestStrings {
    // App Title
    abstract val appTitle: String
    
    // Tabs
    abstract val tabMedications: String
    abstract val tabGroups: String
    
    // Buttons
    abstract val buttonAdd: String
    abstract val buttonSave: String
    abstract val buttonNewGroup: String
    
    // Labels
    abstract val labelName: String
    abstract val labelGroupName: String
    abstract val labelDosage: String
    abstract val labelNotes: String
    
    // Messages
    abstract val messageNotFound: String
    abstract val messageDialogNotOpened: String
    abstract val messageAppCrashed: String
}

/**
 * Deutsche Test-Strings (Standard)
 */
object TestStringsDe : TestStrings() {
    override val appTitle = "PillTracker"
    
    override val tabMedications = "Medikamente"
    override val tabGroups = "Gruppen"
    
    override val buttonAdd = "Hinzufügen"
    override val buttonSave = "Speichern"
    override val buttonNewGroup = "Neue Gruppe"
    
    override val labelName = "Name"
    override val labelGroupName = "Gruppenname"
    override val labelDosage = "Dosierung"
    override val labelNotes = "Notizen"
    
    override val messageNotFound = "nicht gefunden"
    override val messageDialogNotOpened = "Dialog wurde nicht geöffnet"
    override val messageAppCrashed = "App ist abgestürzt oder nicht geladen"
}

/**
 * Englische Test-Strings (Beispiel für Erweiterung)
 * 
 * Um zu aktivieren: getTestStrings("en") verwenden
 */
object TestStringsEn : TestStrings() {
    override val appTitle = "PillTracker"
    
    override val tabMedications = "Medications"
    override val tabGroups = "Groups"
    
    override val buttonAdd = "Add"
    override val buttonSave = "Save"
    override val buttonNewGroup = "New Group"
    
    override val labelName = "Name"
    override val labelGroupName = "Group Name"
    override val labelDosage = "Dosage"
    override val labelNotes = "Notes"
    
    override val messageNotFound = "not found"
    override val messageDialogNotOpened = "dialog was not opened"
    override val messageAppCrashed = "App crashed or not loaded"
}

/**
 * Factory-Funktion für Test-Strings
 * 
 * @param language Sprachcode (de, en, ...)
 * @return TestStrings Objekt für die gewünschte Sprache
 */
fun getTestStrings(language: String = "de"): TestStrings {
    return when (language.lowercase()) {
        "en" -> TestStringsEn
        "de" -> TestStringsDe
        else -> TestStringsDe // Fallback auf Deutsch
    }
}
