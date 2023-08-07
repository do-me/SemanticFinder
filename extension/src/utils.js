export function prettyLog(label, message, labelColor = 'blue', messageColor = 'black') {
    console.log("%c" + label + ": %c" + message,
        "font-weight: bold; color: " + labelColor + ";",
        "font-weight: normal; color: " + messageColor + ";");
}



function splitByChars(text, numChars) {
    let chunks = [];
    let currChunk = '';

    for (let i = 0; i < text.length; i++) {
        currChunk += text[i];

        if (currChunk.trim().length >= numChars && text[i] === '.') {
            chunks.push(currChunk.trim());
            currChunk = '';
        }
    }


    if (currChunk.trim()) {
        chunks.push(currChunk.trim());
    }

    return chunks;
}



export function splitReadableContent(readableContent) {
    return splitByChars(readableContent, 50);
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


