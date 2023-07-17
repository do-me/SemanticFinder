/*
worker will handle
- load model [load_model[name]]
- will call progress bar shit
- embeddings [separate function call listen thing]
 */

import { env, pipeline, AutoTokenizer } from '@xenova/transformers';
import { Pipeline, PreTrainedTokenizer } from '@xenova/transformers';

// env.useBrowserCache = false; // for testing

/**
 * @type {Object<string, EmbeddingVector>}
 */
let embeddingsDict = {};

/**
 * @type {Pipeline}
 */
let embedder;

/**
 * @type {PreTrainedTokenizer}
 */
let tokenizer;


/**
 * @param {string} text
 * @returns {Promise<EmbeddingVector>}
 */
async function embed(text) {
    if (text in embeddingsDict) {
        return embeddingsDict[text];
    }

    let e0 = await embedder(text, { pooling: 'mean', normalize: true });
    embeddingsDict[text] = e0["data"];
    return e0["data"];
}


async function getTokens(text) {
    return await tokenizer(text)["input_ids"]["data"];
}


self.onmessage = async (event) => {
    let message = event.data;
    let text;
    let embedding;
    switch (message.type) {
        case "load":
            console.log("set to load");
            tokenizer = await AutoTokenizer.from_pretrained(message.model_name); // no progress callbacks -- assume its quick
            embedder = await pipeline("feature-extraction", message.model_name,
                {
                    progress_callback: data => {
                        self.postMessage({
                            type: 'download',
                            data: data
                        });
                    }
                });
            break;
        case "query":
            text = message.text;
            embedding = await embed(text);
            self.postMessage({
                type: 'query',
                embedding: embedding
            });
            break;
        case "similarity":
            text = message.text;
            embedding = await embed(text);
            self.postMessage({
                type: 'similarity',
                text: text,
                embedding: embedding
            });
            break;
        case "getTokens":
            text = message.text;
            let tokens = await getTokens(text);
            self.postMessage({
                type: 'tokens',
                text: text,
                tokens: tokens
            });
            break;
        default:
            return;
    }

};
