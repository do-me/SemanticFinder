// content.js
import { prettyLog, splitReadableContent} from './utils.js';
import { Readability } from '@mozilla/readability';
import Mark from 'mark.js';

chrome.runtime.onMessage.addListener((request, sender) => {
    if (request.type === "getText") {
        let documentClone = document.cloneNode(true);
        let {byline, content, dir, excerpt, lang,
            length, siteName, textContent} = new Readability(documentClone).parse();
        prettyLog("article", textContent);
        let texts = splitReadableContent(textContent);
        // console.dir( texts);
        chrome.runtime.sendMessage({type: "tabUpdated", text: texts});
    } else if (request.type === 'highlightAndScroll') {
        highlightAndScrollToText(request.text);
    }
});

let currText;
let instance = new Mark(document.querySelector("body")); // Create a new instance on the body element

function highlightAndScrollToText(text) {
    // If there's a previous highlighted text, unmark it
    if (currText) {
        instance.unmark({ "element": "span", "className": "highlight" });
    }

    // Update the current text
    currText = text;

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
            // Break after scrolling to the first instance
            return false;
        }
    });
}
