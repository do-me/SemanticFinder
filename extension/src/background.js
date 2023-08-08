// background.js - Handles requests from the UI, runs the model, then sends back a response

import { CustomCache } from "./cache.js";
import { prettyLog } from './utils.js';
import {similarity} from './semantic.js';


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

let bodyText = [];
let inputText = "";

let liveProcess = 0;

chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    if (request.type === "tabUpdated") {
        if (request.text.length > 0) {
            bodyText = request.text;
            prettyLog("received " + bodyText.length + " chunks", bodyText);
        }
    } else if (request.type === "inputText") {
        prettyLog("received query", request.text, "grey");
        inputText = request.text;
    } else {
        // prettyLog(request.type, "misc request type");
        return;
    }
    if (!bodyText || !inputText) { return; }

    liveProcess++;
    const processId = liveProcess;

    await processQuery(inputText, bodyText, processId);
});


async function processQuery(query, bodyText, processId) {
    if (bodyText.length === 0) {
        prettyLog("Error", "something went wrong. please reload this page", "red");
    }
    // prettyLog("process " + processId + " beginning", bodyText.length + " items.", "purple");

    let results = [];
    const k = 10;

    let i = 0;
    for (let text of bodyText) {
        if (processId !== liveProcess) {
            // prettyLog("terminated", processId, "green");
            return;
        } // process killed
        // prettyLog("process " + processId + " processing", text, "yellow");

        let sim = await similarity(query, text);

        if (sim > 0.15) {
            prettyLog("selected", text);
            results.push({sim: sim, text: text});
            results.sort((a, b) => b.sim - a.sim);
            results.length = Math.min(results.length, k);

            // Send the results up to the cutoff point
            chrome.runtime.sendMessage({type: "results", progress: 100 * (i / bodyText.length),
                text: results });
        }
        i += 1;
    }
    chrome.runtime.sendMessage({type: "results", progress: 100 });
    prettyLog("completed", processId, "green");
}

//////////////////////////////////////////////////////////////

