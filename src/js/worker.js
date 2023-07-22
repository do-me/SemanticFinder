import { pipeline, AutoTokenizer } from '@xenova/transformers';

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

    const e0 = await embedder(text, { pooling: 'mean', normalize: true });
    embeddingsDict[text] = e0.data;
    return e0.data;
}

async function getTokens(text) {
    return await tokenizer(text).input_ids.data;
}

self.onmessage = async(event) => {
    const message = event.data;
    let text;
    let embedding;
    switch (message.type) {
    case 'load':
        embeddingsDict = {}; // clear dict
        tokenizer = await AutoTokenizer.from_pretrained(message.model_name); // no progress callbacks -- assume its quick
        embedder = await pipeline('feature-extraction', message.model_name,
            {
                progress_callback: data => {
                    self.postMessage({
                        type: 'download',
                        data
                    });
                }
            });
        break;
    case 'query':
        text = message.text;
        embedding = await embed(text);
        self.postMessage({
            type: 'query',
            embedding
        });
        break;
    case 'similarity':
        text = message.text;
        embedding = await embed(text);
        self.postMessage({
            type: 'similarity',
            text,
            embedding
        });
        break;
    case 'getTokens':
        text = message.text;
        self.postMessage({
            type: 'tokens',
            text,
            tokens: await getTokens(text)
        });
        break;
    default:
    }
};
