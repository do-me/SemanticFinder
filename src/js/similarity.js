/**
 * @typedef {Array<number>} EmbeddingVector
 * @param {EmbeddingVector} e1
 * @param {EmbeddingVector} e2
 * @returns {number}
 */
export function calculateCosineSimilarity(e1, e2) {
    let dotProduct = 0;
    let queryMagnitude = 0;
    let embeddingMagnitude = 0;
    let queryEmbeddingLength = e1.length
    for (let i = 0; i < queryEmbeddingLength; i++) {
        dotProduct += e1[i] * e2[i];
        queryMagnitude += e1[i] ** 2;
        embeddingMagnitude += e2[i] ** 2;
    }
    return dotProduct / (Math.sqrt(queryMagnitude) * Math.sqrt(embeddingMagnitude));
}

