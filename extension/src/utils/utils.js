export function prettyLog(label, message, labelColor = 'blue', messageColor = 'black') {
    console.log("%c" + label + ": %c" + message,
        "font-weight: bold; color: " + labelColor + ";",
        "font-weight: normal; color: " + messageColor + ";");
}


/*  Looks for a sentence ending after numChars.  */
function splitByChars(text, numChars) {
    let chunks = [];
    let currChunk = '';
    const sentenceEndings = ['.', '?', '!', ';', ':', '\n', '–'];

    for (let i = 0; i < text.length; i++) {
        currChunk += text[i];

        let isEndingPunctuation = sentenceEndings.includes(text[i]);

        // Special case: if the punctuation is a period and the next character is a quote
        if (text[i] === '.' && text[i + 1] === '"') {
            currChunk += text[++i];
            isEndingPunctuation = true;
        }

        if (currChunk.trim().length >= numChars && isEndingPunctuation) {
            chunks.push(currChunk.trim());
            currChunk = '';
        }
    }

    if (currChunk.trim()) {
        chunks.push(currChunk.trim());
    }

    return chunks;
}


export function getSiteID(url) {
    let urlObj = new URL(url);
    return urlObj.hostname + urlObj.pathname;
}


export function splitReadableContent(readableContent, numChars = 50) {
    return splitByChars(readableContent, numChars);
}


function collectTextNodes(element, texts = []) {
    if (element.nodeType === Node.ELEMENT_NODE && element.tagName.toLowerCase() === 'p') {
        let sentences = tokenizer.tokenize(element.textContent); // Tokenize the text content into sentences
        for (let sentence of sentences) {
            sentence = sentence.trim();  // Remove leading/trailing white spaces
            if (sentence !== "") {
                texts.push(sentence);
            }
        }
    } else {
        for (let child of element.childNodes) {
            collectTextNodes(child, texts);
        }
    }
    return texts;
}


