import {getTokens} from "./semantic";

/**
 * @param {string} text 
 * @param {string} splitType 
 * @param {string} splitParam 
 * @returns {Promise<Array<string> | null>}
 */
export async function splitText(text, splitType, splitParam) {
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

/**
 * @param {string} text 
 * @param {number} numTokens 
 * @returns {Promise<Array<string> | null>}
 */
async function splitByTokens(text, numTokens) {
    const words = text.split(' ');
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

/**
 * @param {string} text 
 * @param {number} numWords 
 * @returns {Array<string> | null}
 */
function splitByWords(text, numWords) {
    if (isNaN(numWords) || !Number.isInteger(numWords)) {
        console.error("numWords must be an integer.");
        return null;
    }

    const words = text.split(" ");
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

/**
 * @param {string} text 
 * @param {number} numChars 
 * @returns {Array<string> | null}
 */
function splitByChars(text, numChars) {
    const words = text.split(' ');
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

/**
 * @param {string} text 
 * @returns {Array<string> | null}
 */
function splitBySentences(text) {
    return text.match(/[^\.!\?]+[\.!\?]+/g);
}

/**
 * @param {string} text 
 * @param {string} r 
 * @returns {Array<string> | null}
 */
function splitByRegex(text, r) {
    let regex = new RegExp(r, 'g');
    return text.split(regex);
}
