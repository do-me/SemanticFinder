// @ts-nocheck

import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import CodeMirror from 'codemirror';
import pako from 'pako';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/addon/search/searchcursor.js';

import { loadSemantic, loadChat, loadSummary, similarity, embedQuery, summarizeText, chatText } from './semantic.js';
import { splitText, showToast} from './utils.js';

import '../css/styles.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'codemirror/lib/codemirror.css';

import logo from './SemanticFinder.svg';

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
const summaryButton = document.getElementById('get_summary')
const chatButton = document.getElementById('get_chat')
const progressBarEmbeddings = document.getElementById('progressBarProgress');
const progressBarChat = document.getElementById('progressBarChat');
const progressBarSummary = document.getElementById('progressBarSummary');

async function fetchModels(modelType, sortOption) {
    try {
        const filename = `models/${modelType}_${sortOption}_sizes.json`;
        const response = await fetch(filename);

        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json()
        return data;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function replaceOptionsWithJSONData(jsonData) {
    // Get the select element
    const selectElement = document.getElementById("model-name");

    // Clear existing options
    selectElement.innerHTML = "";

    // Iterate over the models and add options to the select element
    jsonData.models.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = `${model.id} | 💾${model.model_size}Mb 📥${model.downloads} ❤️${model.likes}`;

        // Check if the current model's ID is "TaylorAI/gte-tiny"
        if (model.id === "TaylorAI/gte-tiny") {
            option.selected = true;
        }

        selectElement.appendChild(option);
    });
}

////////////////////////////////////
function removeHighlights() {
    markers.forEach(_ => _.clear());
    markers.length = 0;
}

function deactivateSubmitButton(button = submitButton) {
    if (button) {
        button.setAttribute('disabled', '');
        button.textContent = 'Loading...';
    }
}

function activateSubmitButton(button = submitButton, buttonText = "Find") {
    if (button) {
        button.removeAttribute('disabled');
        button.textContent = buttonText;
    }
}

function finishCallback() {
    summaryButton.removeAttribute('disabled');
    chatButton.removeAttribute('disabled');
    submitButton.textContent = 'Find';
    isProcessing = false;
    const processTime = new Date().getTime() - submitTime;
    console.log(`Finished ${processTime}ms`);
    //tsne(); // for development perform tsne right after finishing
    activateScrollButtons();
}

async function onSubmit() {
    summaryButton.setAttribute('disabled', '');
    chatButton.setAttribute('disabled', '');
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

async function resetResults() {
    removeHighlights();

    // Get results list element
    const resultsDiv = document.getElementById('results-list');
    resultsDiv.innerHTML = '';
}

/**
 *
 * @param {*} results
 */
async function updateResults(results) {
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
        listItem.addEventListener('click', function () {
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

async function setProgressBarValue(value, progressBar = progressBarEmbeddings) {
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


function updateSplitParam(splitParamValue) {
    const splitParam = document.getElementById('split-param');

    switch (splitParamValue) {
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
}

async function CoderMirrorFindAndScrollIntoView(CM_text) {
    editor.scrollIntoView(CM_text.find())
}

let cachedQueryValues = 
    {"text" : "",
    "splitType": "",
    "splitParam":"",
    "inputTexts":"",
    "inputQuery":""

    }

async function semanticHighlight(callback) {
    deactivateScrollButtons();
    resetResults();
    setProgressBarValue(0);

    // query input embedding
    const inputQuery = document.getElementById('query-text').value;

    // chunk vals
    const text = editor.getValue('');
    const splitType = document.getElementById('split-type').value;
    const splitParam = document.getElementById('split-param').value;

    // avoid executing the chunking logic if params are the same
    const chunkValuesEqual = (
        text === cachedQueryValues.text &&
        splitType === cachedQueryValues.splitType &&
        splitParam === cachedQueryValues.splitParam
    );
    
    let inputTexts;

    if (chunkValuesEqual) {
        inputTexts = cachedQueryValues.inputTexts
    } else {
        inputTexts = await splitText(text, splitType, splitParam);
    
        //inputTexts = await splitText(text, splitType, splitParam);
        // update cache var
        cachedQueryValues.text = text;
        cachedQueryValues.splitType = splitType;
        cachedQueryValues.splitParam = splitParam;
        cachedQueryValues.inputTexts = inputTexts;

    }


// full text search NULL CHECKS !
 
  // Example usage:
  const wordsToCheckAnyInput = document.getElementById("wordsToCheckAny");
  const wordsToCheckAllInput = document.getElementById("wordsToCheckAll");
  const wordsToAvoidAnyInput = document.getElementById("wordsToAvoidAny");
  const wordsToAvoidAllInput = document.getElementById("wordsToAvoidAll");
  
  const wordsToCheckAny = wordsToCheckAnyInput.value.trim() ? wordsToCheckAnyInput.value.split(',').map(word => word.trim()) : [];
  const wordsToCheckAll = wordsToCheckAllInput.value.trim() ? wordsToCheckAllInput.value.split(',').map(word => word.trim()) : [];
  const wordsToAvoidAny = wordsToAvoidAnyInput.value.trim() ? wordsToAvoidAnyInput.value.split(',').map(word => word.trim()) : [];
  const wordsToAvoidAll = wordsToAvoidAllInput.value.trim() ? wordsToAvoidAllInput.value.split(',').map(word => word.trim()) : [];
  
  
  const filterTexts = (inputTexts, wordsToCheckAny, wordsToCheckAll, wordsToAvoidAny, wordsToAvoidAll) => {
    return inputTexts.reduce((result, text) => {
      // Skip empty fields or fields containing only an empty string
      if (text.trim() === "") {
        return result;
      }
  
      const shouldInclude =
        (isEmptyArray(wordsToCheckAny) || wordsToCheckAny.some(word => text.includes(word))) &&
        (isEmptyArray(wordsToAvoidAny) || !wordsToAvoidAny.some(word => text.includes(word))) &&
        (isEmptyArray(wordsToCheckAll) || wordsToCheckAll.every(word => text.includes(word))) &&
        (isEmptyArray(wordsToAvoidAll) || !wordsToAvoidAll.every(word => text.includes(word)));
  
      if (shouldInclude) {
        result.push(text);
      }
  
      return result;
    }, []);
  };
  
  const isEmptyArray = (arr) => arr.length === 0 || (arr.length === 1 && arr[0] === "");
  
  // Example usage:

  inputTexts = filterTexts(inputTexts, wordsToCheckAny, wordsToCheckAll, wordsToAvoidAny, wordsToAvoidAll);

  // full text search
  
    //console.log(inputTexts)

    //let inputTexts = await splitText(text, splitType, splitParam);
    // Initialize inputTexts dictionary with 0 as similarity
    inputTexts = inputTexts.reduce((acc, text) => {
        acc[text] = 0;
        return acc;
    }, {});

    const numUpdates = document.getElementById('update-rate').value;

    await embedQuery(inputQuery);

    const N = Object.keys(inputTexts).length;
    const interval = Math.ceil(N / Math.min(numUpdates, N));
    const progressBarInterval = Math.ceil(N / Math.min(100, N));

    // this part here is still a performance bottleneck and responsible for ~50% of the processing time 
    // it performs a lookup in a dictionary where key-value pairs (text-embeddings) are stored
    // if the value has an embedding already, it's appended to the results dict 
    // if not, it needs to be calculated 
    // the logic has the advantage that when e.g. one sentence is appended to a book, 99% of the index 
    // can be reused and it is super fast. On the other hand it slows down other user cases where you know 
    // in advance, that the text:embeddings won't change.
    // will need to add a cache for inputTexts in the future

    let i = 0;
    let lastProgressBarUpdate = 0;
    const inputTextPromises = Object.keys(inputTexts).map(async (inputText, i) => {
        if (!isProcessing) {
          return Promise.resolve();
        }
      
        const cosineSimilarity = await similarity(inputText);

        inputTexts[inputText] = cosineSimilarity;
      
        if (i % progressBarInterval === 0 || i === N - 1) {
            const currentTime = Date.now();
            const timeSinceLastUpdate = currentTime - lastProgressBarUpdate;
            
            // update the porgress bar only every 100ms to avoid slowing down on consecutive calls
            // makes ~0.3s difference with 23k embeddings!
            if (timeSinceLastUpdate >= 100) {
              const progress = Math.round(((i + 1) * 100) / N);
              setProgressBarValue(progress);
          
              lastProgressBarUpdate = currentTime;
            }
          }
        
        if (i === N - 1) {
            const progress = Math.round(((i + 1) * 100) / N);
              setProgressBarValue(progress);
        }
      
        if (i !== 0 && (i % interval === 0 || i === N - 1)) {
            const sortedResults = Object.entries(inputTexts).sort((a, b) => b[1] - a[1]);
            updateResults(sortedResults);
          if (markers.length > 0 && (selectedIndex === -1 || selectedIndex === 0)) {
            CoderMirrorFindAndScrollIntoView(markers[0]);
          }
        }
      
        return Promise.resolve();
      });
      
      await Promise.all(inputTextPromises);
      
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

async function summarizeTopResults() {
    var topResultsString = Array.from(document.querySelectorAll('#results-list .card-title')).map(title => title.textContent).join('; ');
    //console.log(topResultsString)
    //let currentTopResults = "The tower is 324 metres (1,063 ft) tall, about the same height as an 81-storey building, and the tallest structure in Paris. Its base is square, measuring 125 metres (410 ft) on each side. During its construction, the Eiffel Tower surpassed the Washington Monument to become the tallest man-made structure in the world, a title it held for 41 years until the Chrysler Building in New York City was finished in 1930. It was the first structure to reach a height of 300 metres. Due to the addition of a broadcasting aerial at the top of the tower in 1957, it is now taller than the Chrysler Building by 5.2 metres (17 ft). Excluding transmitters, the Eiffel Tower is the second tallest free-standing structure in France after the Millau Viaduct."
    const currentSummary = await summarizeText(topResultsString);
    //console.log(currentSummary[0].summary_text)
    //document.getElementById("summary_text").innerHTML = currentSummary[0].summary_text //out[0].summary_text;
}

async function chatTopResults() {
    document.getElementById("chat_text").innerHTML = "";
    var chatQuery = "Based on the following input, answer the question:" + document.getElementById("chat_query").value;
    var max_new_tokens = document.getElementById("chat_max_new_tokens").value;

    var topResultsString = chatQuery + " Context:\nParagraph: " + Array.from(document.querySelectorAll('#results-list .card-title')).map(title => title.textContent).join('\nParagraph: ');
    const currentChat = await chatText(topResultsString, max_new_tokens);
}

function resetMetadata() {
    document.getElementById("textTitle").value = "";
    document.getElementById("textAuthor").value = "";
    document.getElementById("textYear").value = "";
    document.getElementById("textSourceURL").value = "";
    document.getElementById("textNotes").value = "";
    document.getElementById("textLanguage").value = "";
}


function createMetaJSON() {

    const modelName = document.getElementById("model-name").value;
    const quantized = document.getElementById("quantized").checked;
    const splitType = document.getElementById("split-type").value;
    const splitParam = document.getElementById("split-param").value;
    const exportDecimals = parseInt(document.getElementById("exportDecimals").value);
    const textTitle = document.getElementById("textTitle").value;
    const textAuthor = document.getElementById("textAuthor").value;
    const textYear = parseInt(document.getElementById("textYear").value, 10);
    const textSourceURL = document.getElementById("textSourceURL").value;
    const textNotes = document.getElementById("textNotes").value;
    const textLanguage = document.getElementById("textLanguage").value;
    const wordsToCheckAny = document.getElementById("wordsToCheckAny").value;
    const wordsToCheckAll = document.getElementById("wordsToCheckAll").value;
    const wordsToAvoidAny = document.getElementById("wordsToAvoidAny").value;
    const wordsToAvoidAll = document.getElementById("wordsToAvoidAll").value;
  
    const lines = editor.lineCount();
    const characters = editor.getValue().length;
    
    // shorthand property names
    const metaJSON = {
        textTitle,
        textAuthor,
        textYear,
        textLanguage,
        textSourceURL,
        textNotes,
        modelName,
        quantized,
        splitType,
        splitParam,
        exportDecimals,
        lines,
        characters,
        wordsToCheckAny,
        wordsToCheckAll,
        wordsToAvoidAny,
        wordsToAvoidAll

    };
    
    return metaJSON
}

function setValuesFromMetaJSON(jsonObject) {
    // Set values based on the provided JSON object
    document.getElementById("model-name").value = jsonObject.modelName || "";
    document.getElementById("quantized").checked = jsonObject.quantized;
    document.getElementById("split-type").value = jsonObject.splitType || "";

    document.getElementById("exportDecimals").value = jsonObject.exportDecimals || "";
    document.getElementById("textTitle").value = jsonObject.textTitle || "";
    document.getElementById("textAuthor").value = jsonObject.textAuthor || "";
    document.getElementById("textYear").value = jsonObject.textYear || "";
    document.getElementById("textSourceURL").value = jsonObject.textSourceURL || "";
    document.getElementById("textNotes").value = jsonObject.textNotes || "";
    document.getElementById("textLanguage").value = jsonObject.textLanguage || "";
    document.getElementById("wordsToCheckAny").value = jsonObject.wordsToCheckAny || "";
    document.getElementById("wordsToCheckAll").value = jsonObject.wordsToCheckAll || "";
    document.getElementById("wordsToAvoidAny").value = jsonObject.wordsToAvoidAny || "";
    document.getElementById("wordsToAvoidAll").value = jsonObject.wordsToAvoidAll || "";

    updateSplitParam(jsonObject.splitType); // causing a bug, needs fix
    document.getElementById("split-param").value = jsonObject.splitParam || "";
}



async function reloadModel(modelName){
    deactivateSubmitButton();
    setProgressBarValue(0);
    await loadSemantic(modelName);
    activateSubmitButton();
}

function handleFileUpload() {
    console.log("⌛ File upload started...")
    showToast("⌛ File upload started...");
    const fileInput = document.getElementById('file-upload');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file.');
        return;
    }

    // Read the file as an ArrayBuffer
    const reader = new FileReader();
    reader.onload = function (event) {
        const arrayBuffer = event.target.result;

        // Use pako.js to decompress the gzip data
        const inflatedData = pako.inflate(arrayBuffer, { to: 'string' });

        // Convert the JSON string to a JavaScript object
        const jsonData = JSON.parse(inflatedData);

        setValuesFromMetaJSON(jsonData.meta)

        if (jsonData && jsonData.text !== "") {
            editor.setValue(jsonData.text);
        }

        reloadModel(jsonData.meta.modelName)

        // Post the data to the semanticWorker
        semanticWorker.postMessage({ type: 'importEmbeddingsDict', data: jsonData.index });
    };

    // Read the file as an ArrayBuffer
    reader.readAsArrayBuffer(file);
    //submitButton.click(); // dont click as the model must load first!

    showToast("Index loaded ✅");
    console.log('Index loaded ✅');
}

function handleRemoteFileUpload(fileURL ) {
    editor.setValue("");
    document.getElementById('update-rate').value = 1;
    showToast("⌛ Loading file...");
    console.log(fileURL)

    if (!fileURL) {
        alert('Please enter a valid URL.');
        return;
    }

    // Make a fetch request to get the remote file
    fetch(fileURL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch file (${response.status} ${response.statusText})`);
            }
            return response.arrayBuffer();
        })
        .then(arrayBuffer => {
            // Use pako.js to decompress the gzip data
            const inflatedData = pako.inflate(arrayBuffer, { to: 'string' });

            // Convert the JSON string to a JavaScript object
            const jsonData = JSON.parse(inflatedData);

            setValuesFromMetaJSON(jsonData.meta);

            if (jsonData && jsonData.text !== "") {
                editor.setValue(jsonData.text);
            }

            reloadModel(jsonData.meta.modelName);

            // Post the data to the semanticWorker
            semanticWorker.postMessage({ type: 'importEmbeddingsDict', data: jsonData.index });

            showToast("Index loaded ✅");
        })
        .catch(error => {
            alert(`Error: ${error.message}`);
        });
}

// Function to generate random points with labels and colors
function generateRandomPoints(numPoints) {
    const points = [];
    for (let i = 0; i < numPoints; i++) {
        const point = {
            x: Math.random() * 500, // Adjust the range as needed
            y: Math.random() * 500,
            label: generateRandomString(),
            color: Math.random() // Random value between 0 and 1 for shades of green
        };
        points.push(point);
    }
    return points;
}

// Function to generate a random string
function generateRandomString() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

async function tsne() {
    semanticWorker.postMessage({
        type: "tsne",
        data: {
            "iterations": document.getElementById("dimReductionIterations").value        
        }

    });
}

/**
 * Setup the application when the page loads.
 */
window.onload = async function () {
    window.onSubmit = onSubmit;

    editor = CodeMirror.fromTextArea(document.getElementById('input-text'), {
        lineNumbers: true,
        mode: 'text/plain',
        matchBrackets: true,
        lineWrapping: true
    });

    const fontFamilyInput = document.getElementById("font-family");
    const fontSizeInput = document.getElementById("font-size");

    const updateStyles = () => {
        const newFontFamily = fontFamilyInput.value;
        const newFontSize = fontSizeInput.value + "px";
        const codeMirrorElement = document.querySelector(".CodeMirror.cm-s-default.CodeMirror-wrap");

        codeMirrorElement.style.fontFamily = newFontFamily;
        codeMirrorElement.style.fontSize = newFontSize;
    };

    document.addEventListener("input", (event) => {
        if (event.target === fontFamilyInput || event.target === fontSizeInput) {
            updateStyles();
        }
    });

    document.getElementById('model-name').addEventListener('change', async function () {
        deactivateSubmitButton();
        setProgressBarValue(0);
        const modelName = this.value;
        await loadSemantic(modelName);
        activateSubmitButton();
    });

    document.getElementById('quantized').addEventListener('change', async function () {
        deactivateSubmitButton();
        setProgressBarValue(0);
        const modelName = document.getElementById("model-name").value
        await loadSemantic(modelName);
        activateSubmitButton();
    });

    document.getElementById('summary-model-name').addEventListener('change', async function () {
        deactivateSubmitButton(summaryButton);
        setProgressBarValue(0, progressBarSummary);
        const modelName = this.value;
        await loadSummary(modelName);
        activateSubmitButton(summaryButton, "Summarize");
    });

    document.getElementById('chat-model-name').addEventListener('change', async function () {
        deactivateSubmitButton(chatButton);
        setProgressBarValue(0, progressBarChat);
        const modelName = this.value;
        console.log(modelName);
        await loadChat(modelName);
        activateSubmitButton(chatButton, "Chat");
    });
    
    // Call the function manually or bind it to an event
    document.getElementById('split-type').addEventListener('change', function() {
        updateSplitParam(document.getElementById('split-type').value);
    });

    // Example of calling the function manually
    // updateSplitParam();
    


    // Dynamically load/overwrite existing options from JSON. Useful for different sorting or updates.
    //const modelType = 'feature-extraction'; // Replace with 'text2text' if needed
    //const sortingOptions = ['trending', 'likes', 'downloads', 'modified'];
    //const selectedSortOption = 'downloads'; // Replace with the desired sorting option
    //fetchModels(modelType, selectedSortOption)
    //    .then(data => {
    //        if (data) {
    //            console.log(data);
    //            replaceOptionsWithJSONData(data)
    //        }
    //    })
    //    .catch(err => {
    //        console.error('Error:', err);
    //    });

    let summary_is_loaded = true; // Flag to track the first click
    document.getElementById('get_summary').addEventListener('click', async function (event) {
        deactivateSubmitButton(summaryButton);
        event.preventDefault();
        let this_model = document.getElementById('summary-model-name').value;

        if (summary_is_loaded) {
            await loadSummary(this_model); // Execute only on the first click
            summary_is_loaded = false; // Set the flag to false after the first click
        }

        await summarizeTopResults(); // Execute on every click after the first one
        activateSubmitButton(summaryButton, "Summarize");
    });

    let chat_is_loaded = true; // Flag to track the first click
    document.getElementById('get_chat').addEventListener('click', async function (event) {
        deactivateSubmitButton(chatButton);
        event.preventDefault();
        let this_model = document.getElementById('chat-model-name').value;

        if (chat_is_loaded) {
            await loadChat(this_model); // Execute only on the first click
            chat_is_loaded = false; // Set the flag to false after the first click
        }

        await chatTopResults(); // Execute on every click after the first one
        activateSubmitButton(chatButton, "Chat");
    });


    document.getElementById('next').addEventListener('click', function (event) {
        event.preventDefault();
        nextMarker();
    });

    document.getElementById('prev').addEventListener('click', function (event) {
        event.preventDefault();
        prevMarker();
    });

    function exportEmbeddings(type, text = '') {
        semanticWorker.postMessage({
            type: type,
            data: {
                "text": text,
                "meta": createMetaJSON()
            }
        });
    }

    document.getElementById('exportEmbeddingsDict').addEventListener('click', function (event) {
        exportEmbeddings('exportEmbeddingsDict');
    });

    document.getElementById('resetMetadata').addEventListener('click', function (event) {
        resetMetadata();
    });

    document.getElementById('dimensionalityReduction').addEventListener('click', function (event) {
        tsne();
    });

    document.getElementById('exportEmbeddingsDictWithText').addEventListener('click', function (event) {
        const currentEditorText = editor.getValue('');
        exportEmbeddings('exportEmbeddingsDict', currentEditorText);
    });

    document.getElementById('confirm-upload').addEventListener('click', function (event) {
        document.getElementById('update-rate').value = 1;
        handleFileUpload();
    });

    document.getElementById('confirm-remote-upload').addEventListener('click', function (event) {
        document.getElementById('update-rate').value = 1;
        handleRemoteFileUpload(document.getElementById('importURL').value);
    });

    // initialize loading
    // read url params and load from Hf or from remote 
    const getUrlParameters = () => new URLSearchParams(window.location.search);
    const urlParams = getUrlParameters();

    if (urlParams.has('url')) {
        handleRemoteFileUpload(urlParams.get('url'));

    } else if (urlParams.has('hf')) {
        handleRemoteFileUpload(
            `https://huggingface.co/datasets/do-me/SemanticFinder/resolve/main/${urlParams.get('hf')}.json.gz`);

    } 
    else {
        const modelName = document.getElementById('model-name').value;
        await loadSemantic(modelName);
        activateSubmitButton();
    }
};