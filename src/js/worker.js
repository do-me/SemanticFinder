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


let tokenizer;

let chatModel = 'Xenova/t5-small';

async function token_to_text(beams){
    let chatTokenizer = await AutoTokenizer.from_pretrained(chatModel);
    let decoded_text =  chatTokenizer.decode(beams[0].output_token_ids, {
        skip_special_tokens: true
    });
    console.log(decoded_text);
    return decoded_text
}


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

self.onmessage = async (event) => {
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
        case 'summary':
            text = message.text
            let generator = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6',
                {
                    progress_callback: data => {
                        self.postMessage({
                            type: 'summary_download',
                            data
                        });
                    }
                });
            let thisSummary = await generator(text, {
                max_new_tokens: 200,
            })

            self.postMessage({
                type: 'summary',
                summary: thisSummary
            });
            break;
        case 'chat':
            text = message.text.trim()
            let max_new_tokens = message.max_new_tokens
            console.log(max_new_tokens, chatModel, text)

            let chatGenerator = await pipeline('text2text-generation', chatModel,
                {
                    progress_callback: data => {
                        self.postMessage({
                            type: 'chat_download',
                            data
                        });
                    }
                });

            let thisChat = await chatGenerator(text, {
                max_new_tokens: max_new_tokens,
                return_prompt: false,
                callback_function: async function (beams) {
                    //console.log(beams);
                    const decodedText = token_to_text(beams)
                    console.log(decodedText);
                }
            });

            self.postMessage({
                type: 'chat',
                chat: thisChat
            });

            break;

        default:
    }
};
