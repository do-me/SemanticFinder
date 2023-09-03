
console.log("Script loaded");
let loadCount = 0;

document.addEventListener('DOMContentLoaded', function() {
    loadCount++;
    console.log("DOMContentLoaded triggered", loadCount);
    // Load saved settings when the page is loaded
    loadSettings();

    // Save settings when the "Save Settings" button is clicked
    const b = document.getElementById('saveButton')
    if (b) {
        b.addEventListener('click', saveSettings);
    }

    // Restore default settings when the "Restore Defaults" button is clicked
    const r = document.getElementById('restoreButton')
    if (r) {
        r.addEventListener('click', restoreDefaults);
    }
});

function saveSettings(showAlert = true) {
    const modelName = document.getElementById('modelSelector').value;
    const numChars = document.getElementById('minCharsInput').value;

    chrome.storage.sync.set({
        'model_name': modelName,
        'num_chars': numChars
    }, function() {
        if (showAlert) {
            alert('Settings saved.');
        }
    });
}

function restoreDefaults() {
    document.getElementById('modelSelector').value = 'Supabase/gte-small'; // Default model
    document.getElementById('minCharsInput').value = 50; // Default number

    // Optional: Automatically save defaults back to storage
    saveSettings(false);  // Don't show an alert here
}


function loadSettings() {
    chrome.storage.sync.get(['model_name', 'num_chars'], function(items) {
        if (items['model_name']) {
            const s = document.getElementById('modelSelector')
            if (s) {
                s.value = items['model_name'];
            }
        }
        if (items['num_chars']) {
            const m = document.getElementById('minCharsInput')
            if (m) {
                m.value = items['num_chars'];
            }
        }
    });
}
