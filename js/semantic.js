import { env, pipeline, AutoTokenizer } from '@xenova/transformers';

env.allowLocalModels = false;

let embedder;
let tokenizer;

export async function loadSemantic() {
    embedder = await pipeline("embeddings", 'Xenova/all-MiniLM-L6-v2');
    tokenizer = await AutoTokenizer.from_pretrained("Xenova/all-MiniLM-L6-v2");
}

export async function similarity(text, inputQuery) {
    let inputEmbedding = await embed(inputQuery);

    if (Array.isArray(text)) {
        // if text is array embed each item individually
        let similarities = [];
        for (let i = 0; i < text.length; i++) {
            let textEmbedding = await embed(text[i]);
            similarities.push(calculateCosineSimilarity(inputEmbedding, textEmbedding));
        }
        return similarities;
    }
    let textEmbedding = await embed(text);
    return calculateCosineSimilarity(inputEmbedding, textEmbedding);
}

export function calculateCosineSimilarity(queryEmbedding, embedding) {
    let dotProduct = 0;
    let queryMagnitude = 0;
    let embeddingMagnitude = 0;
    let queryEmbeddingLength = queryEmbedding.length
    for (let i = 0; i < queryEmbeddingLength; i++) {
        dotProduct += queryEmbedding[i] * embedding[i];
        queryMagnitude += queryEmbedding[i] ** 2;
        embeddingMagnitude += embedding[i] ** 2;
    }
    return dotProduct / (Math.sqrt(queryMagnitude) * Math.sqrt(embeddingMagnitude));
}

let embeddingsDict = {};

export async function embed(text) {
    if (text in embeddingsDict) {
        return embeddingsDict[text];
    }

    let e0 = await embedder(text, { pooling: 'mean', normalize: true });
    embeddingsDict[text] = e0["data"];
    return e0["data"];
}

export async function computeQueryEmbedding(inputQuery){
    let queryEmbedding = await embed(inputQuery);
    return queryEmbedding["data"]
}

async function getTokens(text) {
    return await tokenizer(text);
}