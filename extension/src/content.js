// content.js
import {prettyLog, splitReadableContent} from './utils.js';
import {Readability} from '@mozilla/readability';
import Mark from 'mark.js';
import {getDocument, GlobalWorkerOptions} from 'pdfjs-dist';


async function fetchAndExtractPDFText(url) {
    GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('./pdf.worker.js');

    const pdf = await getDocument(url).promise;

    let totalPages = pdf.numPages;
    let texts = [];

    for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        texts.push(pageText);
    }

    return texts.join(' ');
}


chrome.runtime.onMessage.addListener(async function(request, sender) {
    try {
        if (request.type === "getText") {
            let currentURL = window.location.href;
            let texts = [];
            prettyLog("url", currentURL);
            if (currentURL.endsWith('.pdf')) {
                let textContent = await fetchAndExtractPDFText(currentURL);
                texts = splitReadableContent(textContent);
            } else {
                let documentClone = document.cloneNode(true);
                let {
                    byline, content, dir, excerpt, lang,
                    length, siteName, textContent
                } = new Readability(documentClone).parse();
                prettyLog("article", textContent);
                texts = splitReadableContent(textContent);
            }
            chrome.runtime.sendMessage({type: "tabUpdated", text: texts, currentURL});
        } else if (request.type === 'highlightAndScroll') {
            highlightAndScrollToText(request.text);
        }
    } catch (error) {
        prettyLog("ERROR", error.message, "red", "red");
        if (error.message.includes('net::ERR_BLOCKED_BY_CLIENT')) {
            chrome.runtime.sendMessage({type: "error", reason: "ERR_BLOCKED_BY_CLIENT"});
        } else {
            chrome.runtime.sendMessage({type: "error", reason: error.message});
        }
    }
});


let currText;
let instance = new Mark(document.querySelector("body")); // Create a new instance on the body element

function highlightAndScrollToText(text) {
    // If there's a previous highlighted text, unmark it
    if (currText) {
        instance.unmark({"element": "span", "className": "highlight"});
    }

    currText = text;

    let textFound = false;

    // Mark and highlight the new text
    instance.mark(text, {
        "element": "span",
        "separateWordSearch": false,
        "className": "highlight",
        "acrossElements": true,
        "each": function (node) {
            // Scroll to the first instance of it
            node.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
            textFound = true;
            return false;
        }
    });

    // If text not found, split and find the longest segment
    if (!textFound) {
        let segments = text.split('\n');
        let longestSegment = segments.sort((a, b) => b.length - a.length)[0];
        if (longestSegment) {
            highlightAndScrollToText(longestSegment); // Recursive call
        }
    }
}


