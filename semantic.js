import $ from 'jquery';
import { pipeline, AutoTokenizer } from '@xenova/transformers';

let embedder;
let tokenizer;

export async function loadSemantic() {
    embedder = await pipeline("embeddings", 'Xenova/all-MiniLM-L6-v2');
    tokenizer = await AutoTokenizer.from_pretrained("Xenova/all-MiniLM-L6-v2");
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


export async function embed(text) {
    return await embedder(text, { pooling: 'mean', normalize: true });
}

export async function computeQueryEmbedding(){
    let inputQuery = $("#query-text").val()
    let queryEmbedding = await embed(inputQuery);
    // let queryEmbeddingDict = {inputQuery: queryEmbedding}
    //console.log(queryEmbedding)
    return queryEmbedding["data"]
}

async function getTokens(text) {
    return await tokenizer(text);
}