import {getTokens} from "./semantic";

/**
 * 
 * @param {string} paragraph 
 * @returns {Array<string> | null}
 */
function splitIntoSentences(paragraph) {
    return paragraph.match(/[^\.!\?]+[\.!\?]+/g);
}


export async function splitText(text) {
    const splitType = document.getElementById('split-type').value;
    const splitParam = document.getElementById('split-param').value;

    switch(splitType) {
        case 'Regex':
            return splitByRegex(text, splitParam);
        case 'Sentence':
            return splitBySentences(text);
        case 'Words':
            return splitByWords(text, parseInt(splitParam));
        case 'Chars':
            return splitByChars(text, parseInt(splitParam));
        case 'Tokens':
            return await splitByTokens(text, parseInt(splitParam));
        default:
            console.error('Invalid split type');
            return null;
    }
}

async function splitByTokens(str, numTokens) {
    const words = str.split(' ');
    const chunks = [];

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const tokens = await getTokens(word);

        // Check if there's no chunk or if the last chunk + the new word would exceed numTokens
        if (chunks.length === 0 || (await getTokens(chunks[chunks.length - 1])).length + tokens.length > numTokens) {
            chunks.push(word);
        } else {
            chunks[chunks.length - 1] += ' ' + word;
        }
    }
    console.table(chunks);
    return chunks;
}


function splitByWords(str, numWords) {
    if (isNaN(numWords) || !Number.isInteger(numWords)) {
        console.error("numWords must be an integer.");
        return null;
    }

    const words = str.split(" ");
    const chunks = [];

    let currentChunk = [];
    for (let i = 0; i < words.length; i++) {
        currentChunk.push(words[i]);

        if (currentChunk.length === numWords) {
            chunks.push(currentChunk.join(' '));
            currentChunk = [];
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
    }

    console.table(chunks);
    return chunks;
}


function splitByChars(str, numChars) {
    const words = str.split(' ');
    const chunks = [];

    for (let i = 0; i < words.length; i++) {
        const word = words[i];

        if (chunks.length === 0 || chunks[chunks.length - 1].length + word.length + 1 > numChars) {
            chunks.push(word);
        } else {
            chunks[chunks.length - 1] += ' ' + word;
        }
    }
    console.table(chunks);

    return chunks;
}


function splitBySentences(text) {
    return text.match(/[^\.!\?]+[\.!\?]+/g);
}

function splitByRegex(str, r) {
    let regex = new RegExp(r, 'g');
    return str.split(regex);
}
