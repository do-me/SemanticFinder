
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();

    const b = document.getElementById('saveButton')
    if (b) {
        b.addEventListener('click', saveSettings);
    }

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

    saveSettings(false);
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
