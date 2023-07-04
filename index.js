import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import $ from 'jquery';
import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/addon/search/searchcursor.js';

import { loadSemantic, calculateCosineSimilarity, computeQueryEmbedding, embed } from './semantic.js';

import './styles.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'codemirror/lib/codemirror.css';

let markers = [];
let isProcessing = false;
let selectedIndex = -1;
let selectedClassName;
let prevCard;
const nextButton = document.getElementById("next");
const prevButton = document.getElementById("prev");
const progressBar = $("#progressBar");
const progressBarProgress = $("#progressBarProgress");
const submitButton = document.getElementById("submit_button");

function removeHighlights() {
    for (let marker of markers) {
        marker.clear();
    }
    markers = [];
}

function activateSubmitButton() {
    // get references to the loading element and submit button
    const loadingElement = document.getElementById("loading");

    // remove the loading element and enable the submit button
    if (loadingElement) {
        loadingElement.remove();
    }

    if (submitButton) {
        submitButton.removeAttribute("disabled");
        submitButton.textContent = "Submit";
    }
}

async function onSubmit() {
    if (!isProcessing) {

        isProcessing = true;
        submitButton.textContent = "Stop";

        document.getElementById('results-list').innerHTML = '';
        selectedIndex = -1;
        await semanticHighlight(finishCallback);
    } else {
        submitButton.textContent = "Submit"
        isProcessing = false;
    }
}
window.onSubmit = onSubmit;

function highlightTopResults(result) {
    removeHighlights();
    highlightText(result[0][0], "highlight-first");
    highlightText(result[1][0], "highlight-second");
    for (let i = 2; i < result.length; i++) {
        if (result[i][1] > $("#threshold").val()) {
            highlightText(result[i][0], "highlight-third");
        } else {
            break;
        }
    }
}

function highlightSelected(index) {
    highlightCard(index);
    if (selectedIndex !== -1) {
        let marker0 = editor.markText(markers[selectedIndex].find().from, markers[selectedIndex].find().to, {className: selectedClassName});
        markers[selectedIndex].clear();
        markers[selectedIndex] = marker0;
    }

    selectedIndex = index;
    selectedClassName = markers[selectedIndex].className;

    let marker1 = editor.markText(markers[selectedIndex].find().from, markers[selectedIndex].find().to, {className: "highlight-select"});
    markers[selectedIndex].clear();
    markers[selectedIndex] = marker1;
}

function highlightCard(index) {
    let resultsDiv = document.getElementById('results-list');
    let cards = resultsDiv.getElementsByClassName('card');

    // Ensure the index is within the range of the cards.
    if (prevCard) {
        prevCard.style.backgroundColor = '';
    }
        prevCard = cards[index];
    cards[index].style.backgroundColor = '#f4ac90';
}

function resetHighlightsProgress(){
    // clear any highlights
    removeHighlights();
    progressBar.attr("value", 0);
    progressBarProgress.text(`${0}`);

}
// $("#token-length").val()

let inputTextsEmbeddings = {};

async function embedPsuedosentences(text) {

}

async function semanticHighlight(callback) {
    deactivateScrollButtons();
    resetHighlightsProgress();
    // await embedPsuedosentences(editor.getValue(""));

    // query input embedding
    let queryEmbedding = await computeQueryEmbedding();
    const text = editor.getValue("");
    let inputTexts = splitSubstrings(text,$("#token-length").val());

    let result = [];
    let max = inputTexts.length;
    //console.log("Embeddings Computation...")
    let i = 0;

    // all are set into play async then function continues
    let interval = setInterval(async () => {
        if (i >= max || !isProcessing) {
            clearInterval(interval);
            callback();
            return;
        }

        let inputText = inputTexts[i];
        let output;
        if (inputText in inputTextsEmbeddings) {
            output = inputTextsEmbeddings[inputText];
        } else {
            output = await embed(inputText);
            inputTextsEmbeddings[inputText] = output;
        }

        // calculate cosine similarity and sort results
        let cosineSimilarity = calculateCosineSimilarity(queryEmbedding, output["data"]);

        result.push([inputText, cosineSimilarity]);
        result.sort((a, b) => b[1] - a[1]);
        if (result.length >= 3) {
            highlightTopResults(result);
            editor.scrollIntoView(markers[0].find())
        }

        updateCards(result);

        // update progress bar
        let progress = Math.round((i + 1)*100 / max);
        progressBar.attr("value", progress);
        progressBarProgress.text(`${progress}`);

        i++;
    }, 0);
}

function updateCards(result) {
    // display results to the right -- we may want to move this to after the computation occurs
    let resultsDiv = document.getElementById('results-list');
    resultsDiv.innerHTML = '';
    for (let resultItem of result) {
        if (resultItem[1] > $("#threshold").val()) {
            let listItem = document.createElement('div');
            listItem.classList.add('card');
            listItem.innerHTML = `<div class="card-body">
                                            <h5 class="card-title" style="font-size: 0.9em;">${resultItem[0]}</h5>
                                            <h6 class="card-subtitle mb-2 text-muted" style="font-size: 0.8em;">similarity: ${resultItem[1].toFixed(2)}</h6>
                                        </div>`;
            resultsDiv.appendChild(listItem);


            listItem.addEventListener('click', function() {
                const index = result.indexOf(resultItem);
                editor.scrollIntoView(markers[index].find());
                highlightSelected(index);
            });

        }
    }
}

function splitSubstrings(str, length) {
    const words = str.split(' ');
    const chunks = [];

    for (let i = 0; i < words.length; i++) {
        const word = words[i];

        if (chunks.length === 0 || chunks[chunks.length - 1].length + word.length + 1 > length) {
            chunks.push(word);
        } else {
            chunks[chunks.length - 1] += ' ' + word;
        }
    }
    return chunks;
}

function splitIntoSentences(paragraph) {
    return paragraph.match(/[^\.!\?]+[\.!\?]+/g);
}

var editor = CodeMirror.fromTextArea(document.getElementById('input-text'), {
    lineNumbers: true,
    mode: 'text/plain',
    matchBrackets: true,
    lineWrapping: true,
});

function highlightText(text,className) {
    const cursor = editor.getSearchCursor(text);
    while (cursor.findNext()) {
        let marker = editor.markText(cursor.from(), cursor.to(), {className: className});
        markers.push(marker);
    }
}


function activateScrollButtons() {
    // Enable the next and prev buttons
    if (nextButton) {
        nextButton.removeAttribute("disabled");
    }

    if (prevButton) {
        prevButton.removeAttribute("disabled");
    }
}

function deactivateScrollButtons() {
    // Disable the next and prev buttons
    if (nextButton) {
        nextButton.setAttribute("disabled", "");
    }

    if (prevButton) {
        prevButton.setAttribute("disabled", "");
    }
}

async function main() {
    await loadSemantic();
    activateSubmitButton();
}
main();

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

$('#next').click(function(event){
    event.preventDefault();
    nextMarker();
});

$('#prev').click(function(event){
    event.preventDefault();
    prevMarker();
});


function finishCallback() {
    console.log("Finished");
    submitButton.textContent = "Submit";
    isProcessing = false;

    activateScrollButtons();
}
