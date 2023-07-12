
export function splitSubstrings(str:string, length: number) {
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

export function splitIntoSentences(paragraph: string) {
    return paragraph.match(/[^\.!\?]+[\.!\?]+/g);
}
