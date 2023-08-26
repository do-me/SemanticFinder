// content.js
import {prettyLog, splitReadableContent} from '../utils/utils.js';
import {Readability} from '@mozilla/readability';
import Mark from 'mark.js';
import {getDocument, GlobalWorkerOptions} from 'pdfjs-dist';


async function fetchAndExtractPDFText(url) {
    GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('../serviceworkers/pdf.worker.js');

    const pdf = await getDocument(url).promise;

    let totalPages = pdf.numPages;
    let texts = [];

    for (let i = 1; i <= totalPages; i++) {
        console.log("page ", i);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        texts.push(pageText);
    }

    return texts.join(' ');
}


chrome.runtime.onMessage.addListener(async function(request, sender) {
    try {
        let currentURL = window.location.href;
        if (request.type === "getText") {
            let texts = [];
            // hacky support for pdf
            if (currentURL.endsWith('.pdf')) {
                let textContent = await fetchAndExtractPDFText(currentURL);
                texts = splitReadableContent(textContent);

            } else {
                let concatenatedContent = "";

                const iframes = document.querySelectorAll('iframe');
                console.dir(iframes);

                iframes.forEach(function(iframe) {
                    try {
                        const iframeDocument = iframe.contentDocument;

                        if (iframeDocument) {

                            let { textContent } = new Readability(iframeDocument.cloneNode(true)).parse();
                            prettyLog("Iframe text content:", textContent, "orange");
                            concatenatedContent += textContent;
                        }
                    } catch (error) {
                        prettyLog("Skipped an iframe due to permissions issue:", error, "red");
                    }
                });

                const documentClone = document.cloneNode(true);
                let { textContent } = new Readability(documentClone).parse();
                concatenatedContent += textContent;
                prettyLog("Main document text content:", textContent);

                texts = splitReadableContent(concatenatedContent);

            }
            chrome.runtime.sendMessage({type: "tabUpdated", text: texts, currentURL});
        } else if (request.type === 'highlightAndScroll') {
            // if (currentURL.endsWith('.pdf')) { return; }
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
let instance = new Mark(document.querySelector("body"));

function highlightAndScrollToText(text) {
    // If there's a previous highlighted text, unmark it
    if (currText) {
        instance.unmark({"element": "span", "className": "highlight"});
    }

    currText = text;

    let textFound = false;

    instance.mark(text, {
        "element": "span",
        "separateWordSearch": false,
        "className": "highlight",
        "acrossElements": true,
        "iframes": true,
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


    // can use "noMatch" in markjs instead
    if (!textFound) {
        let segments = text.split('\n');
        let longestSegment = segments.sort((a, b) => b.length - a.length)[0];
        if (longestSegment) {
            highlightAndScrollToText(longestSegment); // Recursive call
        }
    }
}


