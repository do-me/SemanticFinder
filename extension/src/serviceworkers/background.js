// background.js - Handles requests from the UI, runs the model, then sends back a response

import {prettyLog, getSiteID} from '../utils/utils.js';
import {similarity, storeEmbeddings, loadEmbeddings} from "./semantic.js";

////////////////////// 1. Context Menus //////////////////////
//
// Add a listener to create the initial context menu items,
// context menu items only need to be created at runtime.onInstalled
// chrome.runtime.onInstalled.addListener(function () {
// Register a context menu item that will only show up for selection text.
// chrome.contextMenus.create({
//     id: 'classify-selection',
//     title: 'Classify "%s"',
//     contexts: ['selection'],
// });
// });
//
// Perform inference when the user clicks a context menu
// chrome.contextMenus.onClicked.addListener(async (info, tab) => {
// Ignore context menu clicks that are not for classifications (or when there is no input)
// if (info.menuItemId !== 'classify-selection' || !info.selectionText) return;
//
// Perform classification on the selected text
// let result = await classify(info.selectionText);
//
// Do something with the result
// chrome.scripting.executeScript(
//
//     {
//     target: { tabId: tab.id },    // Run in the tab that the user clicked in
//     args: [result],               // The arguments to pass to the function
//     function: (result) => {       // The function to run
//         // NOTE: This function is run in the context of the web page, meaning that `document` is available.
//         console.log('result', result)
//         console.log('document', document)
//     },
// }
// );
// });
//////////////////////////////////////////////////////////////

////////////////////// 2. Message Events /////////////////////
//
// Listen for messages from the UI, process it, and send the result back.

// TODO: body text is not persistent
let bodyText = [];
let inputText = "";

let liveProcess = 0;
let currSite = "";

chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
    if (request.type === "tabUpdated") {
        if (request.text.length > 0) {
            bodyText = request.text;
            currSite = getSiteID(request.currentURL);
        }
    } else if (request.type === "inputText") {
        inputText = request.text;
    } else {return; }
    if (!bodyText || !inputText) {
        return;
    }

    liveProcess++;
    const processId = liveProcess;

    await processQuery(inputText, bodyText, processId);
});


async function processQuery(query, bodyText, processId) {
    if (bodyText.length === 0) {
        prettyLog("Error", "no content found. please reload this page if this is unexpected", "red");
        chrome.runtime.sendMessage({type: "error", reason: "No content detected. Reloading may help."});
        return;  // Exit early if no bodyText
    }

    await loadEmbeddings(currSite);
    prettyLog("starting process " + processId, bodyText.length + " items, input: " + query, "orange");

    let results = [];
    const k = 10;

    let i = 0;
    for (let text of bodyText) {
        if (processId !== liveProcess) { return;}
        let sim = await similarity(query, text);

        if (sim > 0.15) {
            results.push({sim: sim, text: text});
            results.sort((a, b) => b.sim - a.sim);
            results.length = Math.min(results.length, k);

            if (processId !== liveProcess) { return;}
            chrome.runtime.sendMessage({
                type: "results", progress: 100 * (i / bodyText.length),
                text: results
            });
        }
        i += 1;
    }
    chrome.runtime.sendMessage({type: "results", progress: 100});
    await storeEmbeddings();
}

//////////////////////////////////////////////////////////////

