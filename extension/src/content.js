// content.js
import { prettyLog, splitReadableContent} from './utils.js';
import { Readability } from '@mozilla/readability';
import Mark from 'mark.js';

chrome.runtime.onMessage.addListener((request, sender) => {
    try {
        if (request.type === "getText") {
            let documentClone = document.cloneNode(true);
            let {byline, content, dir, excerpt, lang,
                length, siteName, textContent} = new Readability(documentClone).parse();
            prettyLog("article", textContent);
            let texts = splitReadableContent(textContent);
            chrome.runtime.sendMessage({type: "tabUpdated", text: texts, currentURL: window.location.href});
        } else if (request.type === 'highlightAndScroll') {
            highlightAndScrollToText(request.text);
        }
    } catch (error) {
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
        instance.unmark({ "element": "span", "className": "highlight" });
    }

    currText = text;

    let textFound = false;

    // Mark and highlight the new text
    instance.mark(text, {
        "element": "span",
        "separateWordSearch": false,
        "className": "highlight",
        "acrossElements": true,
        "each": function(node) {
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

