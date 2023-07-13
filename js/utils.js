
/**
 * @param {string} str 
 * @param {number} length 
 * @returns {Array<string>}
 */
export function splitSubstrings(str, length) {
    const words = str.split(' ');
    const chunks = [];

    for (let i = 0; i < words.length; i++) {
        const word = words[i];

        if (chunks.length === 0 || chunks[chunks.length - 1].length + word.length + 1 > length) {
            chunks.push(word);
        } else {
            chunks[chunks.length - 1] += ' ' + word;
        }
    }
    return chunks;
}

/**
 * 
 * @param {string} paragraph 
 * @returns {Array<string> | null}
 */
export function splitIntoSentences(paragraph) {
    return paragraph.match(/[^\.!\?]+[\.!\?]+/g);
}