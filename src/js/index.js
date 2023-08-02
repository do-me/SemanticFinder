// @ts-nocheck

import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/addon/search/searchcursor.js';

import { loadSemantic, similarity, embedQuery } from './semantic.js';
import { splitText } from './utils.js';

import '../css/styles.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'codemirror/lib/codemirror.css';

/**
 * @type {Array<CodeMirror.TextMarker>}
 */
let markers = [];
/**
 * @type {CodeMirror.EditorFromTextArea}
 */
let editor;
let submitTime = 0;
let isProcessing = false;
let selectedIndex = -1;
let selectedClassName = '';
let prevCard;
const nextButton = document.getElementById('next');
const prevButton = document.getElementById('prev');
const submitButton = document.getElementById('submit_button');

function removeHighlights() {
    for (const marker of markers) {
        marker.clear();
    }
    markers = [];
}

function deactivateSubmitButton() {
    if (submitButton) {
        submitButton.setAttribute('disabled', '');
        submitButton.textContent = 'Loading...';
    }
}

function activateSubmitButton() {
    if (submitButton) {
        submitButton.removeAttribute('disabled');
        submitButton.textContent = 'Submit';
    }
}

function finishCallback() {
    submitButton.textContent = 'Submit';
    isProcessing = false;
    const processTime = new Date().getTime() - submitTime;
    console.log(`Finished ${processTime}ms`);

    activateScrollButtons();
}

async function onSubmit() {
    if (!isProcessing) {
        submitTime = new Date().getTime();
        isProcessing = true;
        submitButton.textContent = 'Stop';

        document.getElementById('results-list').innerHTML = '';
        selectedIndex = -1;
        await semanticHighlight(finishCallback);
    } else {
        submitButton.textContent = 'Submit';
        isProcessing = false;
    }
}

function resetResults() {
    removeHighlights();

    // Get results list element
    const resultsDiv = document.getElementById('results-list');
    resultsDiv.innerHTML = '';
}

/**
 *
 * @param {*} results
 */
function updateResults(results) {
    resetResults();
    const k = document.getElementById('threshold').value;

    for (let i = 0; i < Math.min(k, results.length); i++) {
        const resultItem = results[i];

        let highlightClass;
        if (i === 0) highlightClass = 'highlight-first';
        else if (i === 1) highlightClass = 'highlight-second';
        else highlightClass = 'highlight-third';

        createHighlight(resultItem[0], highlightClass, resultItem[1]);
    }
}

/**
 * @param {string} text
 * @param {string} className
 * @param {number} similarity
 */
function createHighlight(text, className, similarity) {
    const resultsDiv = document.getElementById('results-list');
    const cursor = editor.getSearchCursor(text);

    while (cursor.findNext()) {
        const marker = editor.markText(cursor.from(), cursor.to(), { className });
        markers.push(marker);

        // create card
        const listItem = document.createElement('div');
        listItem.classList.add('card');
        listItem.innerHTML = createCardHTML(text, similarity);

        resultsDiv.appendChild(listItem);

        const index = resultsDiv.childElementCount - 1;

        // Add click listener for card
        listItem.addEventListener('click', function() {
            editor.scrollIntoView(markers[index].find());
            highlightSelected(index);
        });
    }
}

/**
 * @param {string} title
 * @param {number} similarity
 * @returns
 */
function createCardHTML(title, similarity) {
    return `
        <div class="card-body">
            <h5 class="card-title">${title}</h5>
            <h6 class="card-subtitle mb-2 text-muted">similarity: ${similarity.toFixed(2)}</h6>
        </div>
    `;
}

/**
 *
 * @param {number} index
 */
function highlightSelected(index) {
    highlightCard(index);
    if (selectedIndex !== -1) {
        const marker0 = editor.markText(markers[selectedIndex].find().from, markers[selectedIndex].find().to, { className: selectedClassName });
        markers[selectedIndex].clear();
        markers[selectedIndex] = marker0;
    }

    selectedIndex = index;
    selectedClassName = markers[selectedIndex].className;

    const marker1 = editor.markText(markers[selectedIndex].find().from, markers[selectedIndex].find().to, { className: 'highlight-select' });
    markers[selectedIndex].clear();
    markers[selectedIndex] = marker1;
}

function highlightCard(index) {
    const resultsDiv = document.getElementById('results-list');
    const cards = resultsDiv.getElementsByClassName('card');

    // Ensure the index is within the range of the cards.
    if (prevCard) {
        prevCard.style.backgroundColor = '';
    }
    prevCard = cards[index];
    cards[index].style.backgroundColor = '#f4ac90';
}

function setProgressBarValue(value) {
    const progressBar = document.getElementById('progressBarProgress');
    if (value === '' || value === '0') {
        progressBar.style.transition = 'width .1s ease'; // Temporarily override the transition duration
        progressBar.classList.add('progress-bar-animated');
        progressBar.classList.add('progress-bar-striped');
    } else {
        progressBar.style.transition = ''; // Restore the original transition
    }

    progressBar.style.width = value + '%';
    progressBar.textContent = value + '%';
    progressBar.parentNode.setAttribute('aria-valuenow', value);

    if (value === 100) {
        progressBar.classList.remove('progress-bar-animated');
        progressBar.classList.remove('progress-bar-striped');
    }
}

async function semanticHighlight(callback) {
    deactivateScrollButtons();
    resetResults();
    setProgressBarValue(0);

    // query input embedding
    const text = editor.getValue('');
    const inputQuery = document.getElementById('query-text').value;
    const splitType = document.getElementById('split-type').value;
    const splitParam = document.getElementById('split-param').value;
    const inputTexts = await splitText(text, splitType, splitParam);

    await embedQuery(inputQuery);

    const results = [];

    // Only update results a max of numUpdates times
    const numUpdates = 100;
    const N = inputTexts.length;
    const interval = Math.ceil(N / Math.min(numUpdates, N));

    for (let i = 0; i < N; i++) {
        const inputText = inputTexts[i];
        if (!isProcessing) {
            break;
        }

        const cosineSimilarity = await similarity(inputText);

        results.push([inputText, cosineSimilarity]);

        if (i % interval === 0 || i === N - 1) {
            results.sort((a, b) => b[1] - a[1]);

            updateResults(results);
            if (markers.length > 0 && (selectedIndex === -1 || selectedIndex === 0)) {
                editor.scrollIntoView(markers[0].find());
            }

            const progress = Math.round(((i + 1) * 100) / N);
            setProgressBarValue(progress);
        }
    }

    callback();
}

function activateScrollButtons() {
    // Enable the next and prev buttons
    if (nextButton) {
        nextButton.removeAttribute('disabled');
    }

    if (prevButton) {
        prevButton.removeAttribute('disabled');
    }
}

function deactivateScrollButtons() {
    // Disable the next and prev buttons
    if (nextButton) {
        nextButton.setAttribute('disabled', '');
    }

    if (prevButton) {
        prevButton.setAttribute('disabled', '');
    }
}

function nextMarker() {
    if (selectedIndex === -1) {
        highlightSelected(0);
    } else {
        highlightSelected((selectedIndex + 1) % markers.length);
        editor.scrollIntoView(markers[selectedIndex].find());
    }
}

function prevMarker() {
    if (selectedIndex === -1) {
        highlightSelected(0);
    } else {
        highlightSelected((selectedIndex - 1 + markers.length) % markers.length);
        editor.scrollIntoView(markers[selectedIndex].find());
    }
}

/**
 * Setup the application when the page loads.
 */
window.onload = async function() {
    window.onSubmit = onSubmit;

    editor = CodeMirror.fromTextArea(document.getElementById('input-text'), {
        lineNumbers: true,
        mode: 'text/plain',
        matchBrackets: true,
        lineWrapping: true
    });

    document.getElementById('model-name').addEventListener('change', async function() {
        deactivateSubmitButton();
        setProgressBarValue(0);
        const modelName = this.value;
        await loadSemantic(modelName);
        activateSubmitButton();
    });

    document.getElementById('split-type').addEventListener('change', function() {
        // Get the selected option value
        const splitParam = document.getElementById('split-param');

        switch (this.value) {
        case 'Words':
            splitParam.disabled = false;
            document.querySelector("label[for='split-param']").textContent = '# Words';
            splitParam.type = 'number';
            splitParam.value = 7;
            splitParam.min = 1;
            break;
        case 'Tokens':
            splitParam.disabled = false;
            document.querySelector("label[for='split-param']").textContent = '# Tokens';
            splitParam.type = 'number';
            splitParam.value = 15;
            splitParam.min = 1;
            splitParam.max = 512;
            break;
        case 'Chars':
            splitParam.disabled = false;
            document.querySelector("label[for='split-param']").textContent = '# Chars';
            splitParam.type = 'number';
            splitParam.value = 40;
            splitParam.min = 1;
            break;
        case 'Regex':
            splitParam.disabled = false;
            document.querySelector("label[for='split-param']").textContent = 'Regex';
            splitParam.type = 'text';
            splitParam.value = '[.,]\\s';
            break;
        default:
            splitParam.value = null;
            splitParam.disabled = true;
            document.querySelector("label[for='split-param']").textContent = '';
            splitParam.placeholder = '';
        }
    });


    const modelName = document.getElementById('model-name').value;
    await loadSemantic(modelName);
    activateSubmitButton();

    document.getElementById('next').addEventListener('click', function(event) {
        event.preventDefault();
        nextMarker();
    });

    document.getElementById('prev').addEventListener('click', function(event) {
        event.preventDefault();
        prevMarker();
    });
};
