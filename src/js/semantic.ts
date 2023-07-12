import { env, pipeline, AutoTokenizer } from '@xenova/transformers';
import type { Pipeline, PreTrainedTokenizer } from "@xenova/transformers";

// @ts-ignore
env.allowLocalModels = false;

let embedder: Pipeline;
let tokenizer: PreTrainedTokenizer;
let embeddingsDict: Record<string, Array<number>> = {};

export async function loadSemantic(modelName = 'Xenova/all-MiniLM-L6-v2') {
    embedder = await pipeline("embeddings", modelName);
    tokenizer = await AutoTokenizer.from_pretrained(modelName);
}

export async function similarity(text: string, inputQuery: string) {
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

function calculateCosineSimilarity(queryEmbedding: Array<number>, embedding: Array<number>) {
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

async function embed(text: string) {
    if (text in embeddingsDict) {
        return embeddingsDict[text];
    }

    let e0 = await embedder(text, { pooling: 'mean', normalize: true });
    embeddingsDict[text] = e0["data"];
    return e0["data"];
}

async function getTokens(text: string) {
    return await tokenizer(text);
}